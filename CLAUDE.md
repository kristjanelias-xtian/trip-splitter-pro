# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family Trip Cost Splitter — A mobile-first web application for splitting costs among groups on trips, with real-time collaboration, meal/activity planning, stay tracking, and shopping list features.

**Tech Stack:**
- Frontend: React 18 + TypeScript, Vite
- Styling: Tailwind CSS + shadcn/ui components (dark mode via `darkMode: 'class'`)
- State: React Context API (one provider per domain)
- Database: Supabase (PostgreSQL + Edge Functions)
- Auth: Supabase Auth (Google OAuth supported)
- Observability: Grafana Cloud (Loki logs + OTLP metrics) via `log-proxy` Edge Function
- Deployment: Cloudflare Pages
- Tests: Vitest + Testing Library (182 tests)

---

## Development Commands

```bash
npm install          # install dependencies
npm run dev          # development server
npm run build        # production build
npm run preview      # preview production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (run before every commit)
npm test             # Vitest
```

---

## Git Workflow

**Always:** branch → commit → PR → squash-merge → delete branch (remote + local)

**Before writing any code**, check out `main`, pull latest, and create a fresh branch. Never make changes directly on `main` or on an unrelated feature branch.

```bash
git checkout -b fix/description
# make changes
npm run type-check   # must pass clean
git add <specific files>
git commit -m "..."
git push -u origin fix/description
gh pr create ...
gh pr merge <N> --squash --delete-branch
git checkout main && git pull
git branch -d fix/description
```

**Hard rules (enforced by hook):**
- NEVER commit directly on `main`. The PreToolUse hook in `.claude/hooks/no-commit-main.sh` will block it.
- If a file changes unexpectedly between your edit and commit, investigate (e.g. check `git diff`) — do not assume a "linter" or external tool made the change. It may be another session or editor process.

- `gh issue close` takes **one issue at a time** (not multiple args in one call)
- Commit messages end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Repo remote name: `kristjanelias-xtian/trip-splitter-pro`

---

## Database Schema

### Core tables (migrations 001–006, updated by family refactor migrations 029–032)
- `trips` — trip metadata, tracking_mode (`individuals` | `families`), trip_code (URL slug), created_by
- `participants` — individuals with optional `wallet_group TEXT` for shared-wallet grouping; `user_id` links to auth user ("This is me"); `nickname TEXT` preserves short name when "This is me" overwrites with full Google name
- `expenses` — expense records with JSONB `distribution` field
- `settlements` — payment transfers between participants/families
- `meals` — meal planning (breakfast/lunch/dinner per day)
- `shopping_items` — shopping list with category, quantity, completion
- `meal_shopping_items` — junction: meals ↔ shopping items

### Columns added to `trips` (migrations 011–018)
- `default_currency TEXT` — base currency for the trip
- `exchange_rates JSONB` — rates for other currencies used
- `enable_meals BOOLEAN` — feature toggle
- `enable_shopping BOOLEAN` — feature toggle
- `enable_activities BOOLEAN` — feature toggle (migration 018)
- `default_split_all BOOLEAN DEFAULT true` — auto-select all participants when adding expense

### RLS policies (migration 026, updated 033, 036)
- `trips`: SELECT open, INSERT auth-only, UPDATE/DELETE creator-only. Migration 033 added admin UUID delete policy.
- `receipt_tasks`: SELECT open to all users (migration 036, matches trips table access model)
- Other tables: standard auth-based policies

### Newer tables
- `user_profiles` — `bank_account_holder`, `bank_iban` (migration 008/012)
- `user_preferences` — per-user `preferred_mode` (`quick`|`full`) + `default_trip_id` (migration 010)
- `activities` — activity planner: date, time_slot (morning/afternoon/evening), title, link, responsible_participant_id (migration 016)
- `stays` — accommodation: name, link, comment, check_in_date, check_out_date, latitude, longitude (migrations 017–018)

**Real-time:** Shopping list uses Supabase real-time subscriptions. Other contexts use optimistic updates only.

---

## Access Model — Core Design Rule

**Trip URL = access token. Never restrict SELECT on the trips table.**

The app's security model is based on trip_code obscurity, not auth.
Anyone with the URL (/t/:tripCode) can read and participate in a trip —
authenticated or not. Authentication unlocks personal features only.

Capability tiers:

Unauthenticated (has URL):
- Full read access to all trip data
- Add/edit expenses, settlements, shopping items, meals, activities, stays

Authenticated:
- Everything above
- "This is me" participant linking → personal balance summary
- View bank account details (for settling up)
- Submit feedback / bug reports

RLS rules that must be maintained on the trips table:
- SELECT: USING (true) — open to all, authenticated and anonymous
- INSERT: restricted to authenticated users (auth.uid() IS NOT NULL)
- UPDATE: restricted to trip creator (auth.uid() = created_by)
- DELETE: restricted to trip creator (auth.uid() = created_by)

Never add participant-based or owner-based SELECT restrictions to trips.
If you believe a SELECT restriction is needed for security, stop and
discuss it first — it will break shared link access for every trip
in the system.

Features that are auth-gated (bank details, personal balance, feedback)
are gated in the UI and edge functions, not at the RLS level.

Common pitfall: adding SELECT RLS that looks correct in isolation
(e.g. "users can only see their own trips") but breaks the shared
link flow entirely. The trip_code in the URL is the only access
control needed for reads.

---

## Architecture

### App Modes (Quick vs Full)

The app has two UI modes that share a **unified home page** but differ inside trip views:

- **Full mode** — multi-page layout inside a trip: Overview / Expenses / Settlements (+ conditional Planner, Shopping), with bottom tab bar (mobile) and side nav (desktop)
- **Quick mode** — streamlined single-trip view focused on balance summary and fast expense entry, no bottom nav

Mode is stored per-user in `user_preferences.preferred_mode` and synced from Supabase on sign-in. Local storage (`spl1t:user-preferences`) is the source of truth when not signed in.

**Key behaviour:**
- **Unified home**: `HomePage` (`src/pages/HomePage.tsx`) renders at `/` for all users. Both modes see the same greeting, scan CTA, and trip cards. There is no separate Quick home page.
- `ConditionalHomePage` wraps `HomePage` — on **mobile viewports (< 768 px) for authenticated users with a trip happening now** (today within start_date..end_date), auto-redirects to `/t/:code/quick`. Otherwise always renders `HomePage`. When navigated to with `location.state.fromTrip` (set by back arrows and home links), the redirect is skipped once so the user can reach the home page from within a trip.
- `/quick` redirects to `/` (backward compat).
- Trip card clicks navigate to Quick or Full based on stored mode preference.
- `ModeToggle` derives `effectiveMode` from the **current pathname** (contains `/quick`?), not solely from the stored pref. Only navigates when inside a trip; on the home page it just updates the preference.

### Context Organisation

| Context | Responsibility |
|---------|---------------|
| `AuthContext` | Supabase auth session, user profile, bank details |
| `TripContext` | Trip list, active trip, CRUD |
| `UserPreferencesContext` | mode (`quick`/`full`), defaultTripId, Supabase sync |
| `ParticipantContext` | Participants (with wallet_group), user↔participant link |
| `ExpenseContext` | Expense CRUD, list |
| `SettlementContext` | Settlement CRUD |
| `MealContext` | Meal calendar, meal↔shopping links |
| `ActivityContext` | Activity planner CRUD |
| `StayContext` | Stay/accommodation CRUD |
| `ShoppingContext` | Real-time shopping list with optimistic UI |

All contexts wrap Supabase calls in `withTimeout` (15 s, from `src/lib/fetchWithTimeout.ts`) so a slow network never leaves the UI stuck.

### Home Page Trip Visibility

The home page shows different trip lists depending on auth state:

**Anonymous users:** Trip references (code + name) are cached in `localStorage` key `trip-splitter:my-trips` (max 100 entries). Trip data always lives in Supabase. `useCurrentTrip` auto-populates localStorage when any trip URL is visited. `TripContext` fetches only these specific trips from DB by `trip_code` (not all trips). If localStorage is cleared (iOS WebKit eviction, new device), the reference list is empty with no recovery path — sign-in is the only way to persist trip links permanently.

**Authenticated users:** `TripContext` fetches trips from DB via three paths: (1) user is creator, (2) user linked as participant (`user_id`), (3) email discovery — someone else added a participant with the user's email but no `user_id` link yet. Then merges any localStorage trips not already in the result. `HomePage` splits these into "My Trips" (creator or linked participant with balance) and "Visited" (localStorage-only, no participant record). Email-discovered trips appear in "My Trips" since they have a participant record.

**Key invariant:** `ensureTripLoaded(tripCode)` in `useCurrentTrip` handles navigation to any trip URL regardless of auth state — even if the trip isn't in the local array. The home page list is a convenience view; the URL is always the access token.

### Tracking Modes (expense splitting)

All expenses use a single distribution type: `individuals`. The `tracking_mode` column still exists in the DB but is always `'individuals'` for new trips (UI selector removed).

Participants can be grouped via `wallet_group TEXT` on the `participants` table. The balance calculator (`buildEntityMap`) groups participants by `wallet_group` at display time — each group settles as a unit. Per-expense `accountForFamilySize` toggle (on `IndividualsDistribution`, labelled "Split equally between groups") controls splitting: OFF (default) = per-person split (group of 3 pays 3× a solo participant), ON = equal per group (each group pays the same share regardless of size).

`calculateWithinGroupBalances()` computes per-member share/paid/balance within a wallet_group. Per-member totalPaid/totalShare sum to the group-level totals from `calculateBalances`, so the breakdown connects to the BalanceCard numbers. Payer is credited with the full expense amount; outsider-paid expenses contribute member shares (paid=0). `balance = paid - share + all settlements involving at least one group member`. External settlements (outsider→member or member→outsider) change a member's net cash position and are included. Balances do NOT sum to zero — the remainder equals the family's remaining external balance (already shown in the group-level BalanceCard). Settlements applied to balance only (not totalPaid/totalShare). Children's balances are folded into adults. UI: shown in `CostBreakdownDialog` (Dashboard click-through on group entity) and `QuickGroupMembersSheet` (Quick mode expand).

### Routes

```
/                          → ConditionalHomePage → HomePage (unified home)
/quick                     → redirects to /
/t/:tripCode               → TripModeRedirect (→ quick or dashboard)
/t/:tripCode/quick         → QuickGroupDetailPage (QuickLayout)
/t/:tripCode/quick/history → QuickHistoryPage (QuickLayout)
/t/:tripCode/expenses      → ExpensesPage (Layout)
/t/:tripCode/settlements   → SettlementsPage (Layout)
/t/:tripCode/planner       → PlannerPage (Layout)
/t/:tripCode/shopping      → ShoppingPage (Layout)
/t/:tripCode/dashboard     → DashboardPage (Layout)
/t/:tripCode/manage        → ManageTripPage (Layout)
/create-trip               → TripsPage (Layout)
/admin/all-trips           → AdminAllTripsPage (Layout)
/join/:token               → JoinPage (invitation acceptance)
/remind/:tripCode          → RemindPage (payment reminder landing)
/trip-not-found/:tripCode  → TripNotFoundPage
```

All trip-scoped routes are wrapped in `TripRouteGuard`. Full-mode routes render inside `Layout`; quick routes inside `QuickLayout`. The home page (`/`) renders inside `Layout`.

### Header Layout (Layout + QuickLayout)

Both layouts use the same responsive header pattern:

- **Mobile (in-trip, not sub-page):** Two-row header. Row 1: back arrow + trip name + avatar. Row 2: `grid-cols-3` action pills (Scan / Manage / mode toggle). Row 2 is `lg:hidden`. Back arrows and home links pass `state: { fromTrip: true }` to prevent `ConditionalHomePage` redirect loop. Both Full and Quick mode headers show the back arrow (← `ArrowLeft` size 20) before the trip name.
- **Desktop (in-trip):** Single-row header. Back arrow + trip name (clickable `<Link>` to home with `fromTrip` state) on left. Scan button + `ModeToggle` + avatar on right (`hidden lg:flex`).
- **Home page:** Single-row. Logo on left, avatar on right. No scan/toggle (the page has its own scan CTA).

Header container: `max-w-lg lg:max-w-7xl mx-auto px-4 lg:px-8`. Main content padding: `pt-[108px] lg:pt-16` (two-row) or `pt-16` (single-row).

Trip gradient pattern: `getTripGradientPattern(trip.name)` returns gradient + decorative icons. Text on gradient uses inline `textShadow: '0 1px 4px rgba(0,0,0,0.9)'` and overlay `from-black/50`.

---

## Key Components & Patterns

### Expense Wizard (`src/components/expenses/ExpenseWizard.tsx`)

On mobile (< 768 px), renders `MobileWizard` (bottom Sheet, 3–4 step wizard). On desktop or in edit mode, renders `ExpenseForm` in a Dialog.

**MobileWizard steps:**
1. Description + Amount + Currency
2. Who paid? (payer selection)
3. Split between whom?
4. Advanced (custom split / date / category / comment) — optional

**Important behaviours:**
- `paidBy` is pre-filled with the auth user's linked adult participant (`participant.user_id === user.id && is_adult`) via a `useEffect` that fires when the form opens and the field is still empty
- `suggestedPayer` banner still shows the balance-based suggestion; tapping it overrides `paidBy`
- `useMediaQuery('(max-width: 768px)')` initialises as `false` on first render, then updates — this is expected behaviour
- Sheet height: `keyboard.isVisible ? availableHeight : 92dvh`
- Sheet bottom: `keyboard.isVisible ? Math.max(0, keyboardHeight - viewportOffset) : undefined` — **critical for iOS** (see iOS section)
- Sheet paddingBottom: `viewportOffset > 0 ? viewportOffset : undefined` — keeps content above keyboard overlap zone when iOS scrolls the visual viewport

### Bottom Sheet Standard (`AppSheet` — `src/components/ui/AppSheet.tsx`)

All 11 bottom sheets follow a single structural standard. Use `AppSheet` for new sheets; existing sheets have been manually aligned to the same pattern.

**Required structure (every bottom sheet, no exceptions):**
- `SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"`
- **Sticky header** (`shrink-0`): 3-slot flex row — back button OR spacer (w-8) | SheetTitle | close button ✕. Below: `border-b border-border`.
- **Scrollable content** (`flex-1 overflow-y-auto overscroll-contain`): the ONLY scrollable region.
- **Optional sticky footer** (`shrink-0`): for CTAs. Outside the scroll container.

**Close button — identical on every sheet:**
```tsx
<button onClick={onClose} aria-label="Close"
  className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
  <X className="w-4 h-4 text-muted-foreground" />
</button>
```

**Height values:**
| Sheet type | Height |
|-----------|--------|
| Standard (forms, inputs, multi-step) | `92dvh` (keyboard: `availableHeight px`) |
| Partial (read-only, pickers) | `75dvh` fixed |

Always `dvh`. **Never** `vh`. **Never** `100vh`. **Never** `h-screen`.

**Dismiss rules:**
- Single-screen sheets: ✕ close only. Left slot = spacer.
- Multi-step sheets: ← back (left) + ✕ close (right). Step 1: spacer instead of back.
- Never show two buttons that both close the sheet.

**Full spec and audit log:** `docs/SHEET_AUDIT.md`

### Quick Actions Standard (QuickGroupDetailPage)

All 4 quick action buttons open **overlays** — never navigate away from `QuickGroupDetailPage`. The pattern:

- **Mobile (< 768px)**: Bottom sheet (`Sheet` + `SheetContent side="bottom"`)
- **Desktop (>= 768px)**: Centered dialog (`Dialog` + `DialogContent`)

Breakpoint detection: `useMediaQuery('(max-width: 767px)')`.

| Button | Mobile | Desktop | Height | Keyboard |
|--------|--------|---------|--------|----------|
| Scan a receipt | Sheet | Dialog `max-w-lg` | `92dvh` | N/A (no inputs) |
| Add an expense | Sheet (MobileWizard) | Dialog `max-w-2xl` | `92dvh` + keyboard | `viewportOffset` ✅ |
| Settle up | Sheet | Dialog `max-w-lg` | `92dvh` + keyboard | `viewportOffset` ✅ |
| View history | Sheet | Dialog `max-w-lg` | `75dvh` | N/A (read-only) |

Desktop dialogs use `hideClose` (custom header close button) + `max-h-[85vh] p-0 gap-0`. Content is shared between Sheet and Dialog via extracted JSX variables.

**Full audit log:** `docs/QUICK_ACTIONS_AUDIT.md`

### Desktop Dialog Sticky Footer Pattern

Desktop dialogs that contain scrollable form content use a flex column layout with a sticky footer for action buttons. The pattern prevents buttons from scrolling out of view:

- `DialogContent`: `max-h-[85vh] flex flex-col p-0 gap-0` (no `overflow-y-auto`)
- Wrapper div: `flex-1 min-h-0 flex flex-col px-6 py-6`
- Form component: accepts `stickyFooter` prop → `flex flex-col min-h-0 flex-1`
- Fields: wrapped in `flex-1 overflow-y-auto overscroll-contain`
- Buttons: `shrink-0 border-t border-border`

Applied to: `ExpenseForm` (via `stickyFooter` prop, used by `ExpenseWizard` desktop path), `SettlementForm` (inline pattern).

### Category Auto-Inference (`src/lib/categoryInference.ts`)

`inferCategory(description)` matches expense descriptions against keyword lists to auto-select category (Food, Accommodation, Transport, Activities, Training). Includes Estonian translations. Used in both `ExpenseForm` (desktop) and `MobileWizard` (mobile) with 300ms debounce. Manual category selection disables auto-inference for that expense via `categoryManuallySet` ref.

### Dark Mode / Theme (`src/hooks/useTheme.ts`)

`useTheme()` hook manages theme state (`light`/`dark`/`system`) persisted in `localStorage` key `spl1t:theme`. Applies `.dark` class to `<html>`. `ThemeToggle` component (`src/components/ThemeToggle.tsx`) renders a segmented control with icon + text labels; accepts `size` prop (`default`/`compact`). Shown in UserMenu dropdown, ManageTripPage settings, and HomePage footer. All colors use CSS custom properties in `index.css` with light/dark variants via `.dark` selector.

### Participant Short Names (`src/lib/participantUtils.ts`)

`buildShortNameMap(participants)` generates unique display names. When multiple participants share the same first name, falls back to full name. Possessive suffixes (Estonian -i, -e endings) are normalized during comparison. Used across ExpenseForm, SettlementForm, balance cards, and all participant pickers.

### iOS Keyboard / Viewport

On iOS Safari the **layout viewport does not shrink** when the soft keyboard opens. A `position: fixed; bottom: 0` Sheet stays at the physical screen bottom — behind the keyboard.

**Critical:** `window.innerHeight` is **unreliable on iOS Safari** — it varies with the URL bar state and does not match the layout viewport height used for fixed positioning. Never use it to compute `bottom` offsets for keyboard-aware sheets. Use `visualViewport.height` and `visualViewport.offsetTop` directly instead.

Fix pattern (in `MobileWizard` — PR #409):
```tsx
style={{
  height: keyboard.isVisible
    ? `${keyboard.availableHeight}px`
    : '92dvh',
  ...(keyboard.isVisible && {
    top: `${keyboard.viewportOffset}px`,
    bottom: 'auto',
  }),
}}
```

This uses **top-based positioning**: `top: visualViewport.offsetTop` anchors the sheet to the visible area's top edge, `height: visualViewport.height` fills exactly to the keyboard, and `bottom: 'auto'` overrides the CSS `bottom: 0`. No dependency on `window.innerHeight`.

`useKeyboardHeight` (`src/hooks/useKeyboardHeight.ts`) uses `window.visualViewport` to detect keyboard visibility. Keyboard is considered open when `window.innerHeight - visualViewport.height > 150px`. Also tracks `viewportOffset` (`visualViewport.offsetTop`) — on iOS, the browser scrolls the visual viewport when a taller keyboard (numpad) opens, which can push the sheet header above the visible area. The `viewportOffset` is used as the `top` value to keep the sheet aligned with the visible area.

**Do not** use `autoFocus` or `ref.focus()` on inputs inside sheets/modals — it triggers the keyboard immediately on open, before the user has tapped anything.

### Decimal Input (iOS)

iOS with a European locale types commas as the decimal separator. All amount inputs must:
```tsx
inputMode="decimal"
onChange={(e) => setValue(e.target.value.replace(',', '.'))}
```

### Logger (`src/lib/logger.ts`)

Routes logs through the `log-proxy` Supabase Edge Function → Grafana Loki. **When Supabase itself is down** the log call also fails. Fix: failed entries are buffered in `localStorage` (`trip-splitter:failed-logs`, max 50 entries) and replayed the next time any log send succeeds. Replayed logs are tagged `[queued]` with the original `queued_at` timestamp.

Always use `logger.error/warn/info` (not just `console.error`) in catch blocks so errors appear in Grafana.

### Planner Page

Week-based Mon→Sun calendar grid. Each day has:
- Up to 3 meals (breakfast / lunch / dinner) — shown if `trip.enable_meals`
- Up to 3 activity slots (morning / afternoon / evening) — shown if `trip.enable_activities`
- Stay indicator (diagonal split on accommodation change days)

Stays are managed separately in `StayContext`. Activities in `ActivityContext`.

### User–Participant Link

`participants.user_id` links a Supabase auth user to their participant record ("This is me"). One user per trip (enforced by unique index). Use `useMyParticipant()` hook to get the current user's participant. Use `useMyTripBalances()` to get the user's balance across all their trips (used on the unified home page). `linkUserToParticipant` syncs `name` and `email` from the Google profile, saves the original short name as `nickname`, and backfills `email` if not set (existing emails are never overwritten).

### Contact Autocomplete (`useTripContacts`)

`useTripContacts(currentTripId)` hook (`src/hooks/useTripContacts.ts`) fetches deduplicated contacts from the current user's other trips — "people you've tripped with". Returns `TripContact[]` with `name`, `email`, `user_id`, `display_name`, `lastSeenAt`. Only runs for authenticated users. Dedup priority: `user_id` > `email` > `name`. Sorted by recency.

Used in `ParticipantsSetup` (Full mode) and `QuickParticipantPicker` (Quick mode) — autocomplete dropdown on Name field + collapsible "Recent" disclosure list. Both use `filteredContacts` memo (min 2 chars, limit 5), keyboard nav, click-outside dismiss.

### Email Templates (`send-email` Edge Function)

`supabase/functions/send-email/index.ts` — Resend API integration. Shared `baseEmailHtml()` wrapper with white header, logo image (`https://split.xtian.me/logo.png`), dark "Spl1t" wordmark (coral "1"), and branded footer — matching the marketing page nav bar. `BRAND` constant object for all color tokens.

Two email types:
- **Invitation**: Sent via per-participant "Send invite" button on the participant list (not during add flow). Creates `invitations` row, generates `/join/:token` link.
- **Payment reminder**: Sent from SettlementsPage "Remind" button. Includes amount owed, optional receipt line-item tables (up to 3), single CTA.

Deploy after changes: `supabase functions deploy send-email`

---

## Observability

- **Grafana Cloud** receives logs (Loki) and metrics (OTLP)
- Browser → `supabase.functions.invoke('log-proxy')` → Grafana Loki
- Edge Functions → `_shared/logger.ts` + `_shared/metrics.ts`
- `logger.setContext({ trip_id, user_id })` persists across subsequent log calls in a session
- Error Rate dashboard panel shows "No data" when Supabase is also down (logs buffer locally)

---

## State Management Patterns

**Optimistic updates:** All contexts update local React state immediately on mutation, then sync to Supabase. On error, the context shows an error message (state is NOT rolled back for most operations — refresh to resync if needed). Shopping context does roll back toggle operations on failure.

**`withTimeout`:** Every Supabase call is wrapped:
```ts
await withTimeout(supabase.from(...).select(...), 15000, 'Descriptive timeout message')
```

**withTimeout standard values:**
- Regular Supabase queries (select, insert, update, delete): 15000 (15s)
- File uploads / Supabase Storage operations: 55000 (55s)
- Edge function calls: 55000 (55s)
- Auth/profile DB calls: 8000–10000 (8–10s)

Never set withTimeout higher than 29000 for regular queries or 59000
for uploads. The fetch-level AbortController in src/lib/supabase.ts
fires at 30s/60s — any withTimeout above these thresholds is dead code
and the user-friendly error message will never be shown.

**Reset pattern in MobileWizard:** Form state resets 300 ms after `open` becomes `false` (to let the close animation complete). Uses `isMounted` ref guard.

---

## Deployment

**Cloudflare Pages:**
- Build command: `npm run build`
- Output directory: `dist`

**Environment variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID` (Google OAuth)
- `VITE_GRAFANA_*` (observability — set in Cloudflare dashboard)

**Supabase Edge Functions:** `log-proxy`, `create-github-issue`, `send-email`

**Demo trip:** `livigno-2025` trip code, seeded via `scripts/seed-demo-trip.ts`. "Try a demo" link on home page navigates to `/t/livigno-2025` (uses `TripModeRedirect`).

**Scripts:** `scripts/audit-trip-balances.ts` (8-check balance integrity audit for production trips), `scripts/seed-demo-trip.ts` (idempotent demo data seeder)

**Running migrations:** Apply SQL files in `supabase/migrations/` in order against the Supabase project.

---

## PWA (Progressive Web App)

The app can be installed as a PWA ("Add to Home Screen"). Three layers ensure it always launches to `/` (the home page): manifest (`start_url: "/"`), service worker (`public/sw.js` — intercepts deep link launches), and client-side guard (`src/main.tsx` — fallback for iOS). All three are needed because iOS ignores `manifest.start_url`.

**Install guide:** `usePWAInstall` hook + `InstallGuide` component (`variant="banner"` on HomePage, `variant="settings"` on ManageTripPage).

**Admin in PWA:** Shield icon → `/admin/all-trips`; uses `navigate()` in standalone mode (not `window.open`).

**Safe-area:** `pwa-safe-bottom` CSS class scoped to `@media (display-mode: standalone)` for iPhone home indicator padding. Applied to bottom nav and sheet footers.

**Pull-to-refresh:** `usePullToRefresh` hook + `PullToRefreshProvider`. Only in standalone PWA mode. Rubber-band 0.5x resistance, 80px threshold. Skips when sheets are open. Pages register callbacks via `useRegisterRefresh`.

See `docs/PWA.md` for full details (gesture behaviour, page callbacks, iOS limitations).

---

## Testing

### Unit Tests
Vitest + Testing Library. Run with `npm test`. 182 tests covering contexts, hooks, and key pages. Test files co-located with source (`*.test.tsx`). Use factories in `src/test/factories.ts` to build test data.

### E2E Smoke Tests (Playwright)
26 automated tests: 13 routes × 2 viewports (mobile 375×812, desktop 1280×720). Supabase fully mocked via `page.route()`. Run with `npm run test:e2e` or `npm run test:e2e:ui`.

### Manual iOS Keyboard Tests

Required on a **physical iPhone (Safari only)** before merging PRs that touch bottom sheets, `useKeyboardHeight`, or `MobileWizard`. Test: open sheet → tap input → switch to numpad → confirm header/close button visible and tappable above keyboard. Playwright cannot trigger the real iOS keyboard (`visualViewport` always reports 0).

**Pass criteria:** Header visible with numpad open, close button tappable, no content behind keyboard, clean re-open. **Fix pattern:** top-based positioning with `viewportOffset` (see iOS Keyboard section). Full test protocol and sheet list in `docs/SHEET_AUDIT.md §8.1`.

### Production Smoke Tests (Playwright MCP)
8 interactive scenarios against https://split.xtian.me via Playwright MCP. Results in `docs/SMOKE_TEST_RESULTS.md`. 2 scenarios require manual Google OAuth; rest are automated.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sheet hidden behind iOS keyboard / numpad | `fixed; bottom:0` behind keyboard, or numpad taller → `visualViewport.offsetTop > 0` hides header | Use top-based positioning: `top: viewportOffset`, `bottom: 'auto'`, `height: availableHeight` when `keyboard.isVisible`. **Never** compute `bottom` from `window.innerHeight`. Manual iPhone test required (Playwright can't trigger real keyboard). |
| Keyboard pops on sheet open | `autoFocus` / `ref.focus()` in useEffect | Remove auto-focus |
| ModeToggle shows wrong state | Reads stored pref, not current route | Use `pathname.includes('/quick')` → `effectiveMode` |
| Mobile lands on all-trips page | Stored pref is `full` from desktop | `ConditionalHomePage` checks `window.innerWidth < 768` |
| Errors missing from Grafana | Logger goes through Supabase which was down | Logs buffered in localStorage; replayed on recovery |
| Amount input rejects comma on iOS | European locale decimal | `inputMode="decimal"` + `replace(',', '.')` |
| Duplicate items in shopping list | Real-time subscription fires on own inserts | Existence check before adding to state |
| All queries freeze after token refresh | Auth lock deadlock — `onAuthStateChange` callback `await`ed DB queries | **Never** `await` Supabase queries inside `onAuthStateChange`. Defer with `setTimeout(fn, 0)`. See below. |
| 403 triggers token refresh | `sessionHealthBus` emitted `auth-error` on 403 | Only emit `auth-error` on 401; 403 is RLS/permissions |
| Mobile redirect loop (back arrow → home → redirect back) | `ConditionalHomePage` auto-redirects to quick view on mobile with active trip | Pass `state: { fromTrip: true }` on back/home links; `ConditionalHomePage` skips redirect when present |
| Sheet vanishes during scan flow | `QuickScanCreateFlow` creates trip with today's date → `ConditionalHomePage` detects active trip → redirects, unmounting sheet | `ConditionalHomePage` skips redirect when `document.querySelector('[role="dialog"][data-state="open"]')` is truthy (PR #498, selector fixed PR #534) |
| Sheet header scrolls away | `overflow-y-auto` on SheetContent or missing `shrink-0` on header | Use flex structure: `shrink-0` header + `flex-1 overflow-y-auto` content. See Bottom Sheet Standard. |
| Two X buttons on sheet | Radix default absolute X + custom close button | Pass `hideClose` to `SheetContent` to suppress Radix default |
| Sheet height wrong on iOS | Using `vh` instead of `dvh` | Always use `dvh`. `vh` does not recalculate when iOS keyboard opens. |
| Infinite re-render crash with Radix Checkbox | Controlled `checked` prop without `onCheckedChange` causes internal `useControllableState` state cycles | Never use Radix Checkbox as display-only. Use a plain `<span>` styled to match instead. |
| iOS scroll lock in bottom sheets | `overscroll-behavior: contain` on scroll containers causes iOS Safari to stop routing scroll events after user reaches a boundary | `useIOSScrollFix` hook — nudges `scrollTop` 1px from boundaries on `touchstart`. Applied to all sheet scroll containers via `ref={scrollRef}`. No-op on non-iOS. |
| "text/html is not a valid JavaScript MIME type" | New deploy changed JS chunk hashes; browser's cached HTML references old chunks; CDN returns SPA fallback HTML | `ErrorBoundary` auto-detects and reloads once (`sessionStorage` guard). If still broken, shows "New version available" card. No code fix needed — just a deploy artifact. |

---

## Auth Safety Rule — NEVER VIOLATE

Never `await` Supabase DB queries inside an `onAuthStateChange` callback. The Supabase auth client (`@supabase/auth-js`) holds an internal lock during subscriber notification (`_notifyAllSubscribers`). Any DB query calls `getSession()` which tries to re-acquire the same lock via `_acquireLock()`. This causes a **permanent circular deadlock** — all queries freeze until page refresh. This is a known upstream issue ([auth-js #762](https://github.com/supabase/auth-js/issues/762)), unfixed as of auth-js 2.84.0.

If you need to fetch/write data after an auth event: use `setTimeout(fn, 0)` to defer the operation to the next macrotask, after the lock is released.

```tsx
// WRONG — will deadlock on token refresh:
supabase.auth.onAuthStateChange(async (event, session) => {
  const { data } = await supabase.from('profiles').select('*')  // DEADLOCK
})

// CORRECT — defers DB work until after lock release:
supabase.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    const { data } = await supabase.from('profiles').select('*')  // Safe
  }, 0)
})
```

This rule applies to **ALL** auth subscribers in **ALL** files, not just `AuthContext.tsx`. See `docs/DIAGNOSIS.md` for the full deadlock chain analysis.
