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
- Tests: Vitest + Testing Library (139 tests)

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

### Core tables (migrations 001–006)
- `trips` — trip metadata, tracking_mode (`individuals` | `families`), trip_code (URL slug), created_by
- `families` — family groups with adults/children counts
- `participants` — individuals linked to a family or standalone; `user_id` links to auth user ("This is me")
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

## Architecture

### App Modes (Quick vs Full)

The app has two distinct UI modes:

- **Full mode** — original multi-page layout: Trips list → select trip → Expenses / Settlements / Planner / Shopping / Dashboard
- **Quick mode** — streamlined single-trip view focused on balance summary and fast expense entry

Mode is stored per-user in `user_preferences.preferred_mode` and synced from Supabase on sign-in. Local storage (`trip-splitter:user-preferences`) is the source of truth when not signed in.

**Key behaviour:**
- `ConditionalHomePage` (`src/pages/ConditionalHomePage.tsx`) renders at `/` and redirects based on mode
- On **mobile viewports (< 768 px)**, always redirects to the active trip's quick page regardless of stored mode preference — prevents desktop "full" preference from stranding mobile users on the all-trips list
- `ModeToggle` derives `effectiveMode` from the **current pathname** (contains `/quick`?), not solely from the stored pref — fixes the toggle showing wrong state after a mobile redirect

### Context Organisation

| Context | Responsibility |
|---------|---------------|
| `AuthContext` | Supabase auth session, user profile, bank details |
| `TripContext` | Trip list, active trip, CRUD |
| `UserPreferencesContext` | mode (`quick`/`full`), defaultTripId, Supabase sync |
| `ParticipantContext` | Participants + families, user↔participant link |
| `ExpenseContext` | Expense CRUD, list |
| `SettlementContext` | Settlement CRUD |
| `MealContext` | Meal calendar, meal↔shopping links |
| `ActivityContext` | Activity planner CRUD |
| `StayContext` | Stay/accommodation CRUD |
| `ShoppingContext` | Real-time shopping list with optimistic UI |

All contexts wrap Supabase calls in `withTimeout` (15 s, from `src/lib/fetchWithTimeout.ts`) so a slow network never leaves the UI stuck.

### Tracking Modes (expense splitting)
1. **individuals** — expenses split per person
2. **families** — expenses split per family unit (with optional proportional-by-size weighting)
3. **mixed** — families + standalone individuals in same expense

Distribution type is stored as JSONB on the expense. `balanceCalculator.ts` handles all three modes.

### Routes

```
/                          → ConditionalHomePage (redirects)
/quick                     → QuickHomeScreen (Quick mode home)
/t/:tripCode               → TripModeRedirect (→ quick or dashboard)
/t/:tripCode/quick         → QuickGroupDetailPage
/t/:tripCode/quick/history → QuickHistoryPage
/t/:tripCode/expenses      → ExpensesPage
/t/:tripCode/settlements   → SettlementsPage
/t/:tripCode/planner       → PlannerPage (meals + activities + stays)
/t/:tripCode/shopping      → ShoppingPage
/t/:tripCode/dashboard     → DashboardPage
/t/:tripCode/manage        → ManageTripPage
/create-trip               → TripsPage
/admin/all-trips           → AdminAllTripsPage
```

All trip-scoped routes are wrapped in `TripRouteGuard`. Full-mode routes render inside `Layout`; quick routes inside `QuickLayout`.

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
- Sheet height: `keyboard.isVisible ? availableHeight : 90vh`
- Sheet bottom: `keyboard.isVisible ? keyboardHeight : undefined` — **critical for iOS** (see iOS section)

### iOS Keyboard / Viewport

On iOS Safari the **layout viewport does not shrink** when the soft keyboard opens. A `position: fixed; bottom: 0` Sheet stays at the physical screen bottom — behind the keyboard.

Fix pattern (in `MobileWizard`):
```tsx
style={{
  height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '90vh',
  bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined,
}}
```

`useKeyboardHeight` (`src/hooks/useKeyboardHeight.ts`) uses `window.visualViewport` to detect keyboard visibility. Keyboard is considered open when `window.innerHeight - visualViewport.height > 150px`.

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

`participants.user_id` links a Supabase auth user to their participant record ("This is me"). One user per trip (enforced by unique index). Use `useMyParticipant()` hook to get the current user's participant. Use `useMyTripBalances()` to get the user's balance across all their trips (used in Quick mode home).

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

Vitest + Testing Library. Run with `npm test`. 139 tests covering contexts, hooks, and key pages. Test files co-located with source (`*.test.tsx`). Use factories in `src/test/factories.ts` to build test data.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sheet hidden behind iOS keyboard | `fixed; bottom:0` behind keyboard | Set `bottom: keyboardHeight` when `keyboard.isVisible` |
| Keyboard pops on sheet open | `autoFocus` / `ref.focus()` in useEffect | Remove auto-focus |
| ModeToggle shows wrong state | Reads stored pref, not current route | Use `pathname.includes('/quick')` → `effectiveMode` |
| Mobile lands on all-trips page | Stored pref is `full` from desktop | `ConditionalHomePage` checks `window.innerWidth < 768` |
| Errors missing from Grafana | Logger goes through Supabase which was down | Logs buffered in localStorage; replayed on recovery |
| Amount input rejects comma on iOS | European locale decimal | `inputMode="decimal"` + `replace(',', '.')` |
| Duplicate items in shopping list | Real-time subscription fires on own inserts | Existence check before adding to state |
