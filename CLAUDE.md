# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family Trip Cost Splitter — A mobile-first web application for splitting costs among groups on trips, with real-time collaboration, meal/activity planning, stay tracking, and shopping list features.

**Tech Stack:**
- Frontend: React 18 + TypeScript, Vite
- Styling: Tailwind CSS + shadcn/ui components
- State: React Context API (one provider per domain)
- Database: Supabase (PostgreSQL + Edge Functions)
- Auth: Supabase Auth (Google OAuth supported)
- Observability: Grafana Cloud (Loki logs + OTLP metrics) via `log-proxy` Edge Function
- Deployment: Cloudflare Pages
- Tests: Vitest + Testing Library (145 tests)

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

- `gh issue close` takes **one issue at a time** (not multiple args in one call)
- Commit messages end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Repo remote name: `kristjanelias-xtian/trip-splitter-pro`

---

## Database Schema

### Core tables (migrations 001–006, updated by family refactor migrations 029–032)
- `trips` — trip metadata, tracking_mode (`individuals` | `families`), trip_code (URL slug), created_by
- `participants` — individuals with optional `wallet_group TEXT` for shared-wallet grouping; `user_id` links to auth user ("This is me")
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

- **Full mode** — multi-page layout inside a trip: Expenses / Settlements / Planner / Shopping / Dashboard, with bottom tab bar (mobile) and side nav (desktop)
- **Quick mode** — streamlined single-trip view focused on balance summary and fast expense entry, no bottom nav

Mode is stored per-user in `user_preferences.preferred_mode` and synced from Supabase on sign-in. Local storage (`spl1t:user-preferences`) is the source of truth when not signed in.

**Key behaviour:**
- **Unified home**: `HomePage` (`src/pages/HomePage.tsx`) renders at `/` for all users. Both modes see the same greeting, scan CTA, and trip cards. There is no separate Quick home page.
- `ConditionalHomePage` wraps `HomePage` — on **mobile viewports (< 768 px) with an active trip**, auto-redirects to `/t/:code/quick`. Otherwise always renders `HomePage`. When navigated to with `location.state.fromTrip` (set by back arrows and home links), the redirect is skipped once so the user can reach the home page from within a trip.
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
```

All trip-scoped routes are wrapped in `TripRouteGuard`. Full-mode routes render inside `Layout`; quick routes inside `QuickLayout`. The home page (`/`) renders inside `Layout`.

### Header Layout (Layout + QuickLayout)

Both layouts use the same responsive header pattern:

- **Mobile (in-trip, not sub-page):** Two-row header. Row 1: back arrow + trip name + avatar. Row 2: `grid-cols-3` action pills (Scan / Manage / mode toggle). Row 2 is `lg:hidden`. Back arrows and home links pass `state: { fromTrip: true }` to prevent `ConditionalHomePage` redirect loop.
- **Desktop (in-trip):** Single-row header. Trip name (clickable `<Link>` to home with `fromTrip` state) on left. Scan button + `ModeToggle` + avatar on right (`hidden lg:flex`).
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

`participants.user_id` links a Supabase auth user to their participant record ("This is me"). One user per trip (enforced by unique index). Use `useMyParticipant()` hook to get the current user's participant. Use `useMyTripBalances()` to get the user's balance across all their trips (used on the unified home page).

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

**Supabase Edge Functions:** `log-proxy`, `create-github-issue`

**Running migrations:** Apply SQL files in `supabase/migrations/` in order against the Supabase project.

---

## Testing

### Unit Tests
Vitest + Testing Library. Run with `npm test`. 145 tests covering contexts, hooks, and key pages. Test files co-located with source (`*.test.tsx`). Use factories in `src/test/factories.ts` to build test data.

### E2E Smoke Tests (Playwright)
26 automated tests: 13 routes × 2 viewports (mobile 375×812, desktop 1280×720). Supabase fully mocked via `page.route()`. Run with `npm run test:e2e` or `npm run test:e2e:ui`.

### Manual iOS Keyboard Tests

Playwright cannot trigger the real iOS Safari keyboard. These tests must be run on a physical iPhone before merging any PR that touches:
- Bottom sheets (`AppSheet`, `MobileWizard`, or any component using `useKeyboardHeight`)
- Form inputs inside sheets (amount fields, text fields)
- `useKeyboardHeight` hook itself
- `MobileWizard.tsx`, `MobileWizardShell.tsx`
- Any file in the "Same vulnerability" list in `docs/SHEET_AUDIT.md §8.1`

**Device:** iPhone (any model with Face ID preferred — taller notch = less visible space = more likely to expose layout bugs)
**Browser:** Safari (not Chrome on iOS — Chrome uses UIWebView which has different keyboard behaviour)

**Test protocol — run for each affected sheet:**

1. Open the sheet on a real iPhone in Safari
2. Tap an amount or text input field
3. Switch from the default keyboard to the **numpad** (tap the numpad/123 key)
   → The numpad is taller than the text keyboard. This is when `visualViewport.offsetTop > 0` occurs.
4. Confirm: the sheet **header and close button (✕)** are fully visible and tappable above the keyboard
5. Confirm: input fields are visible above the keyboard, not hidden behind it
6. Tap the close button — sheet closes cleanly
7. Re-open the sheet and repeat with the text keyboard

**Sheets to test (as of last sheet audit):**
- ExpenseWizard (MobileWizard) — amount field, Step 1
- ReceiptCaptureSheet — no amount field, skip numpad test
- QuickSettlementSheet — amount field
- DayDetailSheet — no amount field, skip numpad test
- ParticipantEditSheet (if exists) — text fields only
- Any new sheet added since the last audit

**Pass criteria:**
- ✅ Header visible with numpad open
- ✅ Close button tappable with numpad open
- ✅ No content hidden behind keyboard
- ✅ Sheet closes cleanly after keyboard interaction
- ✅ Re-opening sheet works (no stale keyboard height)

**Known limitation:** `useKeyboardHeight` uses `window.visualViewport` which is not available in Playwright's simulated environment. Keyboard height is always 0 in automated tests. There is no way to automate these checks — physical device testing is the only option.

**If a sheet fails:** The fix pattern is in `MobileWizard.tsx` (PR #376) — subtract `viewportOffset` from sheet height and add it as `paddingBottom`. See `useKeyboardHeight` hook for the `viewportOffset` value.

### Production Smoke Tests (Playwright MCP)
Interactive browser testing against https://split.xtian.me using Playwright MCP. Results recorded in `docs/SMOKE_TEST_RESULTS.md`. Scenarios cover:
1. Shared link access (unauthenticated) — verifies RLS SELECT policy
2. Shared link access (authenticated non-creator) — requires manual OAuth
3. Expense submit guard — double-tap prevention
4. Error boundary — no white screens during navigation
5. Admin access control — unauthenticated users blocked
6. Session health — requires manual OAuth + wait
7. Trip navigation state clearing — no stale data between trips
8. Console error baseline — no application errors across all pages

Run interactively via Claude Code with Playwright MCP. Scenarios requiring Google OAuth must be tested manually.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sheet hidden behind iOS keyboard | `fixed; bottom:0` behind keyboard | Use top-based positioning: `top: viewportOffset`, `bottom: 'auto'`, `height: availableHeight` when `keyboard.isVisible`. **Never** compute `bottom` from `window.innerHeight` — it's unreliable on iOS Safari. |
| Keyboard pops on sheet open | `autoFocus` / `ref.focus()` in useEffect | Remove auto-focus |
| ModeToggle shows wrong state | Reads stored pref, not current route | Use `pathname.includes('/quick')` → `effectiveMode` |
| Mobile lands on all-trips page | Stored pref is `full` from desktop | `ConditionalHomePage` checks `window.innerWidth < 768` |
| Errors missing from Grafana | Logger goes through Supabase which was down | Logs buffered in localStorage; replayed on recovery |
| Amount input rejects comma on iOS | European locale decimal | `inputMode="decimal"` + `replace(',', '.')` |
| Duplicate items in shopping list | Real-time subscription fires on own inserts | Existence check before adding to state |
| All queries freeze after token refresh | Auth lock deadlock — `onAuthStateChange` callback `await`ed DB queries | **Never** `await` Supabase queries inside `onAuthStateChange`. Defer with `setTimeout(fn, 0)`. See below. |
| 403 triggers token refresh | `sessionHealthBus` emitted `auth-error` on 403 | Only emit `auth-error` on 401; 403 is RLS/permissions |
| Mobile redirect loop (back arrow → home → redirect back) | `ConditionalHomePage` auto-redirects to quick view on mobile with active trip | Pass `state: { fromTrip: true }` on back/home links; `ConditionalHomePage` skips redirect when present |
| Sheet header scrolls away | `overflow-y-auto` on SheetContent or missing `shrink-0` on header | Use flex structure: `shrink-0` header + `flex-1 overflow-y-auto` content. See Bottom Sheet Standard. |
| Two X buttons on sheet | Radix default absolute X + custom close button | Pass `hideClose` to `SheetContent` to suppress Radix default |
| Sheet height wrong on iOS | Using `vh` instead of `dvh` | Always use `dvh`. `vh` does not recalculate when iOS keyboard opens. |
| Sheet header hidden when numpad opens | iOS numpad is taller → `visualViewport.offsetTop > 0` → header above visible area | Use `top: viewportOffset` positioning (see iOS Keyboard section). The `viewportOffset` value shifts the sheet down with the visual viewport. |
| Infinite re-render crash with Radix Checkbox | Controlled `checked` prop without `onCheckedChange` causes internal `useControllableState` state cycles | Never use Radix Checkbox as display-only. Use a plain `<span>` styled to match instead. |
| Sheet content hidden behind numpad (iOS) | numpad is taller than text keyboard → `visualViewport.offsetTop > 0` pushes sheet up | Use top-based positioning: `top: viewportOffset`, `bottom: 'auto'`. See PR #409 and `useKeyboardHeight`. Playwright cannot test this — manual iPhone required. |

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
