# Codebase Audit Report

**Date:** 2026-02-23
**Auditor:** Claude Opus 4.6 (automated, human-directed)
**Scope:** Full codebase review across 15 audit areas

## Files Reviewed

**55 files** across 10 categories:

- **Core infrastructure (10):** supabase.ts, fetchWithTimeout.ts, sessionHealthBus.ts, debugLogger.ts, logger.ts, adminAuth.ts, mutedTripsStorage.ts, myTripsStorage.ts, userPreferencesStorage.ts, utils.ts
- **State management (12):** store.ts + 11 context providers
- **Hooks (7):** useSessionHealth, useAbortController, useMyTripBalances, useMyParticipant, useCurrentTrip, useKeyboardHeight, useScrollIntoView
- **Auth/session components (3):** SessionHealthGate, StaleSessionOverlay, TripRouteGuard
- **App entry (3):** App.tsx, routes.tsx, main.tsx
- **Services (6):** balanceCalculator, settlementOptimizer, transactionHistoryBuilder, mealExpenseLinkService, gradientService, tripGradientService
- **Edge functions (4):** process-receipt, log-proxy, create-github-issue, send-email
- **Key pages (3):** QuickGroupDetailPage, JoinPage, ConditionalHomePage
- **Key components (7):** QuickExpenseSheet, QuickScanCreateFlow, QuickParticipantPicker, ErrorBoundary, ExpenseWizard, ExpenseForm, SettlementForm
- **Docs (3):** PLAN.md, DIAGNOSIS.md, CLAUDE.md

## Findings Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 15    |
| MEDIUM   | 17    |
| LOW      | 10    |
| **Total** | **44** |

---

## Critical

### FINDING-1: ErrorBoundary defined but never used — any render crash shows blank white screen

- **Status: RESOLVED** — `ErrorBoundary` now wraps the entire provider tree in `App.tsx` (inside BrowserRouter, outside AuthProvider). Per-route boundaries added in `routes.tsx` for every page. Reset loop fix (FINDING-31): after 2 failed retries, shows "Go to home" / "Refresh page" buttons with collapsible error details.
- **Area:** 14 (ErrorBoundary coverage)
- **File(s):** `src/components/ErrorBoundary.tsx` (entire file), `src/App.tsx`
- **Description:** `ErrorBoundary` is a fully implemented class component but is **never imported or used** anywhere in the application. It does not wrap any route, provider, or page component. If any component throws a synchronous error during render, React propagates it up the tree with no boundary to catch it, unmounting the entire app and showing a blank white screen.
- **Risk:** Any uncaught render error — null reference, missing context provider, malformed data from API — crashes the entire application with zero recovery path. The user sees a white screen with no explanation. The global `window.addEventListener('error')` in `main.tsx` logs to Grafana but provides no UI recovery.
- **Recommended fix:** Wrap the application tree in `<ErrorBoundary>` in `App.tsx`, inside `BrowserRouter` but outside `AuthProvider`. Consider adding per-route boundaries in `routes.tsx` for granular recovery.

### FINDING-2: Hardcoded admin password fallback 'admin123' in client bundle

- **Status: RESOLVED** — Replaced entire password-based admin auth with a Supabase user ID allowlist. `adminAuth.ts` now exports only `isAdminUser(userId)`. No password, no sessionStorage, no env var. `AdminAllTripsPage` uses `useAuth()` + `isAdminUser()` for access control.
- **Area:** 10 (adminAuth)
- **File(s):** `src/lib/adminAuth.ts:9`
- **Description:** `const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'`. If the environment variable is not set at build time, the admin route is protected by a trivially guessable default password. Because `VITE_` prefixed variables are embedded in the production JavaScript bundle, anyone can discover the password by reading the built source.
- **Risk:** Unauthorized access to `/admin/all-trips`, exposing every trip name, trip code, owner name, and owner email in the system.
- **Recommended fix:** Remove the `|| 'admin123'` fallback entirely. If the env var is missing, disable the admin route. Better yet, move admin auth server-side (see FINDING-5).

---

## High

### FINDING-3: Admin auth is entirely client-side — trivially bypassable

- **Status: RESOLVED** — See FINDING-2. Password-based auth removed entirely. Admin access now checks `isAdminUser(user?.id)` against a hardcoded UUID allowlist. No sessionStorage, no client-side password comparison.
- **Area:** 10 (adminAuth)
- **File(s):** `src/lib/adminAuth.ts:9,29`, `src/lib/adminAuth.ts:14-21`
- **Description:** The admin password is compared client-side (line 29), the password is visible in the JS bundle, and the authenticated state is a plain string `'authenticated'` in `sessionStorage`. Any user can bypass it by running `sessionStorage.setItem('spl1t:admin-auth', 'authenticated')` in the browser console.
- **Risk:** Complete bypass of admin authentication without knowing the password. Any script with page access (extensions, XSS) can grant itself admin privileges.
- **Recommended fix:** Move admin auth server-side: either use Supabase auth with an admin role, create an edge function that validates the password and returns a signed token, or restrict the admin page to specific Supabase user IDs.

### FINDING-4: Trips table RLS policy allows all reads — admin page is security theater

- **Status: PARTIALLY RESOLVED** — Migration 026 replaces the single `FOR ALL USING (true)` policy with per-operation policies: INSERT restricted to authenticated users, UPDATE/DELETE restricted to trip creator. SELECT remains `USING (true)` because the shared link flow requires anonymous read access (TripContext fetches all trips for anon users). Full read restriction requires refactoring the anonymous query to filter by `trip_code` at the DB level.
- **Area:** 10 (adminAuth)
- **File(s):** `supabase/migrations/001_initial_schema.sql` (RLS policy: `USING (true)`)
- **Description:** The trips table RLS policy allows **all** operations to **all** users. Every regular user already has full read access to all trips via `supabase.from('trips').select('*')`. The admin page protects a UI view, not the underlying data.
- **Risk:** Any authenticated user (or anyone with the public anon key) can query all trips in the database. Trip codes, names, and owner information are exposed.
- **Recommended fix:** Tighten trips RLS so users can only see trips they created or participate in. If a global admin view is needed, use a service role key from a server-side edge function.

### FINDING-5: All 4 edge functions lack JWT verification — callable by anyone with the public anon key

- **Status: RESOLVED** — All 4 edge functions now verify the caller's JWT via a shared `_shared/auth.ts` helper (`verifyAuth`). The helper calls `supabase.auth.getUser(token)` and returns 401 if invalid. Applied to: `process-receipt`, `send-email`, `create-github-issue`, `log-proxy`.
- **Area:** 11 (Edge function security)
- **File(s):** `supabase/functions/process-receipt/index.ts:35-64`, `supabase/functions/send-email/index.ts:281-310`, `supabase/functions/create-github-issue/index.ts:15-36`, `supabase/functions/log-proxy/index.ts:15-65`
- **Description:** None of the 4 edge functions verify the caller's JWT. The Supabase anon key (which is public, embedded in the client bundle) is sufficient to invoke any of them. The functions only check the `apikey` header, not the `Authorization` Bearer token.
- **Risk:**
  - **process-receipt:** Attacker triggers Anthropic API calls (financial cost) and can update any receipt_task via service role key.
  - **send-email:** Attacker sends arbitrary emails from `noreply@xtian.me` to any address — phishing, quota exhaustion.
  - **create-github-issue:** Attacker floods the repo with unlimited spam issues.
  - **log-proxy:** Attacker floods Grafana Loki (cost, noise, false incident signals).
- **Recommended fix:** Add JWT verification to all functions:
  ```ts
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
  if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  ```

### FINDING-6: HTML injection in email templates — stored XSS via email

- **Status: RESOLVED** — Added `escapeHtml()` function to `send-email/index.ts`. All user-supplied strings (participantName, organiserName, tripName, payToName, recipientName, formattedAmount, merchant, item names) are now escaped before HTML interpolation. URLs (href values) are not escaped with this function.
- **Area:** 11 (Edge function security)
- **File(s):** `supabase/functions/send-email/index.ts:59-115,188-279`
- **Description:** User-supplied strings (participantName, organiserName, tripName, payToName) are interpolated directly into HTML email templates without escaping. Example: `<h2>Hey ${participantName}!</h2>`. A trip name like `<img src=x onerror=alert(1)>` will be rendered as HTML.
- **Risk:** An attacker creates a trip with a malicious name, then triggers payment reminder emails to other participants. While most email clients strip `<script>`, CSS injection, image-based tracking, and social engineering with fake content are viable attack vectors.
- **Recommended fix:** Apply HTML escaping to all user-provided strings before interpolation:
  ```ts
  function escapeHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
  ```

### FINDING-7: withTimeout doesn't cancel the underlying request — 15s ghost window for duplicate writes

- **Status: RESOLVED** — `withTimeout` now accepts an optional `AbortController` and calls `controller.abort()` on timeout. All mutation calls across 6 contexts pass their controller.
- **Area:** 7 (Background query continuation)
- **File(s):** `src/lib/fetchWithTimeout.ts:1-26`
- **Description:** `withTimeout` is purely a promise-racing mechanism. It rejects at 15s but does NOT abort the AbortController signal. The HTTP-level abort in `supabase.ts` fires at 30s. This creates a 15-second window where the mutation is still running against the database after the UI shows an error.
- **Risk:** If the mutation succeeds between 15-30s, the row is written to the DB. The UI shows an error, the user retries, and a duplicate row is inserted. Expenses and settlements are most vulnerable — no DB unique constraints exist (see FINDING-8).
- **Recommended fix:** Enhance `withTimeout` to accept an optional `AbortController` and abort it on timeout:
  ```ts
  export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message?: string, controller?: AbortController): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { controller?.abort(); reject(new Error(message ?? 'Request timed out')) }, ms)
      promise.then(v => { clearTimeout(timer); resolve(v) }, e => { clearTimeout(timer); reject(e) })
    })
  }
  ```

### FINDING-8: No DB unique constraints on expenses or settlements — no defense against duplicates

- **Status: RESOLVED** — `createExpense` and `createSettlement` now generate UUIDs client-side via `crypto.randomUUID()` and include them in the insert payload. A retry hits a PK conflict instead of creating a duplicate.
- **Area:** 6 (Concurrent mutation safety)
- **File(s):** Database schema (expenses and settlements tables)
- **Description:** The `expenses` table has no unique constraints beyond the primary key (server-generated UUID). Same for `settlements`. If a double-tap or timeout retry fires two identical inserts, both succeed. No deduplication logic exists in the codebase.
- **Risk:** Duplicate expenses directly corrupt balance calculations. Duplicate settlements mean someone appears to have paid twice. Combined with FINDING-7 (ghost window) and FINDING-9 (double-tap race), this is the most likely path to data corruption.
- **Recommended fix:** Generate UUIDs client-side and pass them in the insert, so a retry hits a primary key conflict. Alternatively, add a unique partial index on a natural key (trip_id + amount + paid_by + description + expense_date).

### FINDING-9: Submit button double-tap race condition on all mutation forms

- **Status: RESOLVED** — Added `isSubmittingRef` (synchronous ref guard) to `ExpenseWizard` (MobileWizard), `ExpenseForm`, `QuickSettlementSheet`, and `QuickScanCreateFlow`. Ref is checked/set before any async work and reset in `finally`.
- **Area:** 6 (Concurrent mutation safety)
- **File(s):** `src/components/expenses/ExpenseWizard.tsx:263-264`, `src/components/expenses/ExpenseForm.tsx:243-244`, `src/components/settlements/SettlementForm.tsx:120-150`
- **Description:** All three forms use `if (isSubmitting) return` guards based on React state. React state updates are batched — if the user taps twice quickly, both taps can read `isSubmitting === false` before the first tap's `setIsSubmitting(true)` triggers a re-render.
- **Risk:** On a fast double-tap (especially mobile), two identical mutation calls fire. Combined with FINDING-8, both inserts succeed.
- **Recommended fix:** Use a ref alongside state for the guard: `if (isSubmittingRef.current) return; isSubmittingRef.current = true;` (synchronous, immune to batching). Reset in the `finally` block.

### FINDING-10: 4 contexts silently swallow all timeout/error messages — errors never reach the user

- **Status: RESOLVED** — All 4 contexts now expose `error: string | null` and `clearError()`. Every mutation catch block calls `setError(message)`. Consumer pages (`ShoppingPage`, `PlannerPage`) watch the error state and fire destructive toasts, then clear it.
- **Area:** 4 (Error surfacing)
- **File(s):** `src/contexts/ShoppingContext.tsx`, `src/contexts/MealContext.tsx`, `src/contexts/ActivityContext.tsx`, `src/contexts/StayContext.tsx`
- **Description:** These 4 contexts catch errors in every mutation (create/update/delete), call `logger.error`, and return `null` or `false`. They do not expose an `error` field in their context interface, do not throw, and do not toast. The withTimeout message (e.g., "Creating shopping item timed out. Please check your connection and try again.") is logged to Grafana but the user sees nothing.
- **Risk:** Users perform actions that silently fail. They assume success, may retry creating duplicates, or never notice their data wasn't saved. The planner and shopping features are particularly affected.
- **Recommended fix:** Either expose an `error` state in each context (matching ExpenseContext's pattern) or have mutations throw so callers can catch and toast.

### FINDING-11: ManageTripPage uses wrong localStorage key for trip deletion cleanup

- **Status: RESOLVED** — Replaced manual `localStorage.getItem('myTrips')` with `removeFromMyTrips(currentTrip.trip_code)` from `src/lib/myTripsStorage.ts`.
- **Area:** 2 (Local storage layers)
- **File(s):** `src/pages/ManageTripPage.tsx:201-203`
- **Description:** When a trip is deleted, ManageTripPage reads/writes a key called `'myTrips'`, but the actual My Trips storage module uses `'trip-splitter:my-trips'` (`src/lib/myTripsStorage.ts:8`). The deleted trip is never removed from the real storage.
- **Risk:** Deleted trips persist in the "My Trips" list. `ConditionalHomePage` or `HomePage` may attempt to redirect to a non-existent trip, or display a broken entry. The orphaned `'myTrips'` key also accumulates data that is never cleaned up.
- **Recommended fix:** Replace lines 201-203 with `removeFromMyTrips(currentTrip.trip_code)` from `src/lib/myTripsStorage.ts`.

### FINDING-12: UserPreferencesContext checks old migrated-away key for loading state

- **Status: RESOLVED** — Changed line 29 to check `'spl1t:user-preferences'` (the current key).
- **Area:** 2 (Local storage layers)
- **File(s):** `src/contexts/UserPreferencesContext.tsx:29`
- **Description:** The `loading` state initializer checks `'trip-splitter:user-preferences'` (the old key), but preferences have been migrated to `'spl1t:user-preferences'`. For returning users who've already been migrated, the old key returns `null`, so `loading` initializes to `true` unnecessarily.
- **Risk:** On every app load for migrated users, `loading: true` is set until the useEffect runs and calls `setLoading(false)`. Any component gating on `loading` shows an unnecessary loading state. The E2E test fixture confirms this is a known workaround.
- **Recommended fix:** Change line 29 to check the current key: `return !localStorage.getItem('spl1t:user-preferences')`.

### FINDING-13: 5 contexts don't clear state when navigating between trips

- **Status: RESOLVED** — Added `else` branch to all 5 contexts (ExpenseContext, ParticipantContext, MealContext, ActivityContext, StayContext) that clears state arrays and error when no trip is active, matching SettlementContext's pattern.
- **Area:** 12 (Context init race / sign-out cleanup)
- **File(s):** `src/contexts/ExpenseContext.tsx:206-212`, `src/contexts/ParticipantContext.tsx:348-354`, `src/contexts/MealContext.tsx:77-83`, `src/contexts/ActivityContext.tsx:82-88`, `src/contexts/StayContext.tsx:77-83`
- **Description:** These 5 contexts follow the pattern `if (tripCode && currentTrip) { fetch() }` with **no `else` branch** to clear state. When navigating from trip A to trip B, there's a window where `tripCode` changed but `currentTrip` hasn't resolved yet, during which stale data from trip A remains visible. SettlementContext and ShoppingContext correctly handle this with an `else { setItems([]) }` branch.
- **Risk:** When navigating between trips, stale data from the previous trip may flash briefly on the new trip's page.
- **Recommended fix:** Add an `else` branch that clears state (sets items to `[]`), matching SettlementContext's existing pattern.

### FINDING-14: UserPreferencesContext `hasInitialized` ref not reset on user change

- **Status: RESOLVED** — Added `previousUserIdRef` that tracks user identity; resets `hasInitialized.current = false` when `user?.id` changes.
- **Area:** 12 (Context init race / sign-out cleanup)
- **File(s):** `src/contexts/UserPreferencesContext.tsx:48-49`
- **Description:** `hasInitialized` is a ref that prevents re-fetching after first initialization. After sign-out and sign-in as user B, `hasInitialized.current` is still `true` from user A's session, so preferences for user B are never fetched from Supabase.
- **Risk:** User B sees user A's mode preference (quick/full) and default trip ID until the page is refreshed. This is a cross-session data leak.
- **Recommended fix:** Reset `hasInitialized.current = false` when `user?.id` changes. Add a `previousUserIdRef` and compare on each effect run.

### FINDING-15: useMyTripBalances — no abort controller, no cancelled guard, high fan-out

- **Status: RESOLVED** — Added `cancelled` flag + `AbortController` with cleanup. All 4 queries per trip receive `controller.signal` via `.abortSignal()`. `cancelled` checked before `setTripBalances`. Cleanup aborts controller and sets `cancelled = true`.
- **Area:** 13 (Memory leaks) + 3 (useAbortController)
- **File(s):** `src/hooks/useMyTripBalances.ts:29-117`
- **Description:** The useEffect fires 4 parallel Supabase queries **per trip**. With 10 trips, that's 40 queries. There is no `isMounted`/`cancelled` guard, no `AbortController`, and no cleanup function. Navigating away while loading causes all queries to complete and attempt `setState` on an unmounted component.
- **Risk:** Wasted network requests, console warnings, and potential state updates on unmounted components. On fast navigation between screens, stale data from a previous trip list could briefly appear.
- **Recommended fix:** Add a `cancelled` flag + `useAbortController`. Pass signals to all queries. Check `cancelled` before `setTripBalances`.

### FINDING-16: No client-side or server-side image size limit for receipt scanning

- **Status: RESOLVED** — Client-side: 5MB check after `compressImage()` in both `QuickScanCreateFlow.tsx` and `ReceiptCaptureSheet.tsx`. Server-side: 10MB base64 length check in `process-receipt/index.ts` (returns 413).
- **Area:** 15 (Receipt processing) + 11 (Edge function security)
- **File(s):** `src/components/quick/QuickScanCreateFlow.tsx:161-162`, `supabase/functions/process-receipt/index.ts:64`
- **Description:** No maximum file size is enforced before sending the image to the edge function. The `compressImage` function limits width to 1200px but output size is unpredictable. The edge function receives the full base64 string with no length check.
- **Risk:** Very large images consume edge function memory, cause timeouts, inflate Anthropic API costs, and can leave receipt_tasks stuck in 'processing' state permanently.
- **Recommended fix:** Client-side: check `compressed.size > 5 * 1024 * 1024` before encoding. Server-side: check `image_base64.length > 10 * 1024 * 1024` before processing.

### FINDING-17: Shopping item delete — meal links orphaned on partial failure

- **Status: RESOLVED** — Simplified to a single `DELETE FROM shopping_items WHERE id = ?`. The `meal_shopping_items` FK has `ON DELETE CASCADE` on `shopping_item_id`, so links are automatically cleaned up by PostgreSQL.
- **Area:** 5 (Optimistic rollback)
- **File(s):** `src/contexts/ShoppingContext.tsx:263-306`
- **Description:** `deleteShoppingItem` makes two sequential DB calls: (1) delete meal links, (2) delete the item. If call 1 succeeds but call 2 fails, the item is rolled back in the UI but its meal associations are permanently deleted in the database.
- **Risk:** Data corruption — meal-shopping links destroyed but the shopping item survives. No way for the user to detect or repair this.
- **Recommended fix:** Reverse the order (delete item first, which should cascade) or wrap both operations in a single RPC/transaction.

---

## Medium

### FINDING-18: Dead Zustand store — unused dependency adding bundle weight and confusion

- **Status: RESOLVED** — Deleted `src/store/store.ts`, removed `zustand` from `package.json` dependencies. Verified no references in `dist/` after build.
- **Area:** 1 (Zustand vs Context)
- **File(s):** `src/store/store.ts:1-11`
- **Description:** The Zustand store declares a `currentTripId` state but `useStore` is never imported or used anywhere. The actual current trip is URL-driven via `useCurrentTrip()`. The `zustand` package is bundled as a production dependency (~3.5 KB min+gz) for zero runtime value.
- **Risk:** Confusion for new contributors about which state system is authoritative. Wasted bundle size.
- **Recommended fix:** Delete `src/store/store.ts`, remove `zustand` from `package.json`.

### FINDING-19: myTrips/mutedTrips localStorage can grow unbounded

- **Area:** 2 (Local storage layers)
- **File(s):** `src/lib/myTripsStorage.ts:8`, `src/lib/mutedTripsStorage.ts:6`
- **Description:** `trip-splitter:my-trips` appends a `MyTripEntry` for every trip visited. There is no maximum entry limit and no eviction strategy. Similarly, `trip-splitter:hidden-trips` grows without cap.
- **Risk:** For power users, the array grows indefinitely. `getMyTrips()` parses and sorts the entire array on every call, degrading performance over time. Stale trip names persist if the trip is renamed and never revisited.
- **Recommended fix:** Add a `MAX_ENTRIES` constant (e.g., 100) and trim oldest entries by `lastAccessed` when inserting.

### FINDING-20: process-receipt uses service role key without verifying caller owns the receipt_task

- **Status: RESOLVED** — After JWT verification, `process-receipt` now queries `receipt_tasks` by ID and checks `task.created_by === user.id` before processing. Returns 404 if task not found, 403 if caller is not the owner.
- **Area:** 11 (Edge function security)
- **File(s):** `supabase/functions/process-receipt/index.ts:73`
- **Description:** The function creates a Supabase client with the service role key, bypassing all RLS. Combined with FINDING-5 (no JWT verification), an attacker who knows a receipt_task UUID can overwrite its status, extracted data, or error message.
- **Risk:** Corruption of other users' receipt data. Setting tasks to 'failed' to disrupt the service.
- **Recommended fix:** After adding JWT verification, also verify `receipt_task.created_by === user.id` before updating.

### FINDING-21: AuthContext and UserPreferencesContext have no abort/unmount guards

- **Area:** 3 (useAbortController) + 13 (Memory leaks)
- **File(s):** `src/contexts/AuthContext.tsx:73-165`, `src/contexts/UserPreferencesContext.tsx:37-74`
- **Description:** Both contexts have async operations in useEffects that call setState without cancelled/isMounted guards. AuthContext's `setTimeout`-deferred profile upsert (line 144-153) is never cleared on unmount. UserPreferencesContext's fetch has no cleanup function.
- **Risk:** If these providers unmount during async work (unlikely in production since they wrap the app, but possible during HMR or tests), pending operations will call setState on unmounted components. The uncancelled setTimeout in AuthContext will always execute.
- **Recommended fix:** Add isMounted ref guards. Track and clear setTimeout IDs in the cleanup.

### FINDING-22: Trip/participant/family creation vulnerable to timeout ghost window

- **Status: RESOLVED** — All mutations in TripContext (create/update/delete) and ParticipantContext (8 mutations) now pass AbortController to `withTimeout`, which aborts on timeout.
- **Area:** 7 (Background query continuation)
- **File(s):** `src/contexts/TripContext.tsx:96-164`, `src/contexts/ParticipantContext.tsx:112-137,194-218`
- **Description:** Same 15-30s ghost window as FINDING-7. Trip creation is partially mitigated by the `trip_code` uniqueness constraint. Participant and family creation have no unique constraints that would prevent duplicates.
- **Risk:** Duplicate participants could appear in a trip, causing confusion in expense splitting. Duplicate families would break balance calculations.
- **Recommended fix:** Same systemic fix as FINDING-7 — abort the controller on timeout.

### FINDING-23: Receipt task creation vulnerable to timeout ghost window

- **Status: RESOLVED** — All 4 mutations in ReceiptContext (create/update/complete/dismiss) now pass AbortController to `withTimeout`, which aborts on timeout.
- **Area:** 7 (Background query continuation)
- **File(s):** `src/contexts/ReceiptContext.tsx:89-126`
- **Description:** Receipt task creation uses withTimeout at 15s with no idempotency. A phantom receipt task could be created, causing the same receipt to be processed twice.
- **Risk:** Duplicate receipt processing, wasted edge function invocations, and potentially two expenses from the same receipt.
- **Recommended fix:** Generate the receipt_task UUID client-side, or abort signal on timeout.

### FINDING-24: ReceiptContext mutations swallowed — callers must check boolean return

- **Area:** 4 (Error surfacing)
- **File(s):** `src/contexts/ReceiptContext.tsx:128-216`
- **Description:** `updateReceiptTask`, `completeReceiptTask`, and `dismissReceiptTask` return boolean `false` on failure but do not throw. Error state is only set by `fetchPendingReceipts`, not by mutations. Callers must explicitly check the return value.
- **Risk:** If callers don't check the boolean, timeout messages are lost.
- **Recommended fix:** Either throw on failure or ensure all callers handle the false return with toast feedback.

### FINDING-25: ParticipantContext error not displayed on most consuming pages

- **Area:** 4 (Error surfacing)
- **File(s):** `src/contexts/ParticipantContext.tsx:112-191`
- **Description:** ParticipantContext sets `error` state on failure but doesn't throw. `QuickGroupDetailPage` displays it, but `ManageTripPage` and other pages that call `createParticipant`/`deleteParticipant` don't check for or display the error.
- **Risk:** Participant mutations fail silently on most pages.
- **Recommended fix:** Ensure all pages that trigger participant mutations display the error or handle the null/false return.

### FINDING-26: TripContext doesn't clear trips array on user identity change

- **Status: RESOLVED** — Added `setTrips([])` at the start of the `useEffect` that depends on `user?.id`, before calling `fetchTrips()`. Loading state is already set inside `fetchTrips()`, so components show loading skeleton instead of stale data.
- **Area:** 12 (Context init race / sign-out cleanup)
- **File(s):** `src/contexts/TripContext.tsx:229-233`
- **Description:** When user signs out, TripContext re-fetches for anonymous access but doesn't clear `trips` before the fetch. User A's trips persist in state during the fetch. If user B signs in immediately, user A's data is visible until B's fetch completes.
- **Risk:** Brief flash of previous user's trip data during sign-out/sign-in transitions.
- **Recommended fix:** Add `setTrips([])` at the start of `fetchTrips()` or when `user?.id` changes.

### FINDING-27: Orphaned receipt_tasks stuck in 'processing' state forever

- **Status: RESOLVED** — Client-side: `QuickScanCreateFlow` now marks the task `'failed'` (fire-and-forget) when the edge function doesn't return ok. `ReceiptContext.fetchPendingReceipts` now queries `'failed'` status and includes failed tasks in `pendingReceipts`.
- **Area:** 15 (Receipt processing)
- **File(s):** `src/components/quick/QuickScanCreateFlow.tsx:131-219`
- **Description:** If the process-receipt edge function times out after marking the task 'processing' but before setting 'review' or 'failed', the task is permanently stuck. The pending receipts query only fetches 'review' and 'complete' statuses, so the user never sees the orphaned task.
- **Risk:** User creates a group, the scan appears to fail, but the receipt image was uploaded and the task row exists in a dead state. No retry mechanism, no cleanup.
- **Recommended fix:** Client-side: mark the task 'failed' if the edge function doesn't return ok. Server-side: add a cleanup job for tasks stuck in 'processing' for > 5 minutes.

### FINDING-28: ReceiptContext updateReceiptTask uses `as any` — bypasses type safety

- **Area:** 15 (Receipt processing)
- **File(s):** `src/contexts/ReceiptContext.tsx:134`
- **Description:** `{ ...updates, updated_at: ... } as any` casts away all TypeScript type checking. A caller could pass arbitrary fields like `{ created_by: '...' }` and the function would send them to Supabase.
- **Risk:** Accidental or intentional update of immutable fields. Silent type safety bypass.
- **Recommended fix:** Define an explicit set of updatable fields and validate. Remove the `as any` cast.

### FINDING-29: Unbounded AI output from process-receipt — no item count or merchant name limit

- **Area:** 15 (Receipt processing)
- **File(s):** `supabase/functions/process-receipt/index.ts:126-161`
- **Description:** The AI output validation checks types and defaults but doesn't limit the number of items or the length of the merchant name. A hallucinated response with hundreds of items or a very long merchant name would be stored as-is.
- **Risk:** Very large JSONB values in the database, performance issues in receipt review UI, broken layouts from long merchant names.
- **Recommended fix:** Add post-extraction limits: `items.slice(0, 100)`, `merchant.slice(0, 200)`.

### FINDING-30: Stale `channel` closure in ShoppingContext early-exit path

- **Area:** 8 (Real-time subscriptions)
- **File(s):** `src/contexts/ShoppingContext.tsx:85-95`
- **Description:** The useEffect reads `channel` state at line 88, but `channel` is not in the dependency array. The `if (channel)` check captures a stale closure. In practice, the cleanup return on line 165-168 handles the normal path correctly, making the stale code unreachable.
- **Risk:** Dead code that is misleading but not actively harmful.
- **Recommended fix:** Remove the `channel` state variable and the redundant cleanup on lines 88-91. The local `shoppingChannel` captured by the cleanup closure is sufficient.

### FINDING-31: ErrorBoundary reset loop on deterministic errors

- **Status: RESOLVED** — Added `resetCount` to ErrorBoundary state. After 2 failed retries, "Try Again" is replaced with "Go to home" and "Refresh page" buttons, plus a collapsible `<details>` showing the raw error message and stack trace.
- **Area:** 14 (ErrorBoundary coverage)
- **File(s):** `src/components/ErrorBoundary.tsx:36-38`
- **Description:** The "Try Again" button calls `handleReset` which clears the error, causing React to re-render children. If the error is deterministic (null reference, missing data), clicking "Try Again" immediately throws again — infinite error-reset loop.
- **Risk:** Users in a crash loop with a non-helpful "Try Again" button. The error message shown is a raw JavaScript error.
- **Recommended fix:** After N reset attempts (e.g., 2), show a different UI with "Go Home" and "Refresh Page" buttons.

### FINDING-32: Preferences localStorage/Supabase reconciliation flash

- **Area:** 2 (Local storage layers)
- **File(s):** `src/lib/userPreferencesStorage.ts:30-43`, `src/contexts/UserPreferencesContext.tsx:62-68`
- **Description:** On load, localStorage is read synchronously for initial state, then Supabase fetches and overwrites. During the window between render and Supabase response, the UI uses potentially stale localStorage values. If a network timeout occurs (15s), the stale value persists for the entire session.
- **Risk:** User changed mode on another device → briefly sees wrong mode → jarring flash when Supabase response arrives (or never corrects on timeout).
- **Recommended fix:** Acceptable tradeoff for the local-first pattern. Consider showing a subtle indicator during Supabase sync.

### FINDING-33: QuickScanCreateFlow has no submit guard for "Scan & Create Group"

- **Status: RESOLVED** — Added `isScanningRef` guard at the top of `handleScan`, reset in `finally` block.
- **Area:** 6 (Concurrent mutation safety)
- **File(s):** `src/components/quick/QuickScanCreateFlow.tsx:131-219`
- **Description:** `handleScan` has no `isSubmitting` state or ref guard. The step transition to 'scanning' hides the button, but there's a brief window between tap and `setStep('scanning')` where a second tap could fire.
- **Risk:** Two trips could be created from a single scan attempt. Window is narrow due to React 18 batching but exists.
- **Recommended fix:** Add an `isScanning` ref guard at the top of `handleScan`.

### FINDING-34: Shopping createShoppingItem has no loading guard

- **Area:** 6 (Concurrent mutation safety)
- **File(s):** `src/contexts/ShoppingContext.tsx:171-228`
- **Description:** No loading guard on `createShoppingItem`. A user could rapidly add the same item multiple times. The real-time duplicate guard prevents duplicate renders but not duplicate DB rows.
- **Risk:** Duplicate shopping items in the database. Lower financial impact than expenses.
- **Recommended fix:** Disable the submit button in the calling component while `createShoppingItem` is in flight.

---

## Low

### FINDING-35: Zustand/defaultTripId conceptual overlap invites future misuse

- **Status: RESOLVED** — Zustand store deleted (see FINDING-18).
- **Area:** 1 (Zustand vs Context)
- **File(s):** `src/store/store.ts`, `src/contexts/UserPreferencesContext.tsx:24-25`
- **Description:** The unused Zustand store's `currentTripId` overlaps conceptually with `defaultTripId` in UserPreferencesContext. If someone starts using the store, there would be an immediate sync risk.
- **Risk:** Minimal currently — Zustand store is unused.
- **Recommended fix:** Delete the Zustand store (see FINDING-18).

### FINDING-36: No localStorage schema versioning

- **Area:** 2 (Local storage layers)
- **File(s):** `src/lib/myTripsStorage.ts`, `src/lib/mutedTripsStorage.ts`, `src/lib/userPreferencesStorage.ts`
- **Description:** No version field on any localStorage entry. If the schema changes, existing data will be parsed with new code. `userPreferencesStorage` has key migration but no structural migration. `myTripsStorage` casts directly to `MyTripEntry[]` without validation.
- **Risk:** Future schema changes could break parsing of existing localStorage data.
- **Recommended fix:** Add a `version` field and validation on read.

### FINDING-37: Inconsistent localStorage key naming conventions

- **Area:** 2 (Local storage layers)
- **File(s):** `src/components/OnboardingPrompts.tsx:8-9`
- **Description:** Onboarding dismissal keys use `'split-dismiss-...'` prefix, which matches neither the `spl1t:` nor `trip-splitter:` convention used elsewhere.
- **Risk:** Harder to programmatically enumerate or clear all app-related localStorage keys.
- **Recommended fix:** Rename to `spl1t:dismiss-login-prompt` and `spl1t:dismiss-bank-details-prompt`.

### FINDING-38: Debug logger writes to localStorage on every event

- **Area:** 2 (Local storage layers)
- **File(s):** `src/lib/debugLogger.ts:53,78`
- **Description:** When debug mode is enabled, every `appendLog` call serializes the entire array (up to 500 entries) and writes to localStorage. On a busy session, this creates significant I/O overhead.
- **Risk:** Performance degradation when debug mode is active, especially on low-end mobile devices. Mitigated by debug mode being opt-in.
- **Recommended fix:** Batch writes with `requestIdleCallback` or a debounced flush (max once per 500ms).

### FINDING-39: ShoppingContext/MealContext helper queries missing withTimeout

- **Area:** 3 (useAbortController)
- **File(s):** `src/contexts/ShoppingContext.tsx:342-399`, `src/contexts/MealContext.tsx:194-253`
- **Description:** `getShoppingItemsWithMeals` and `getMealsWithIngredients` make Supabase queries without `withTimeout`. They could hang until the 30s HTTP abort.
- **Risk:** On-demand calls that could hang silently on slow networks. Minor since they're not in useEffects.
- **Recommended fix:** Add `withTimeout` for consistency.

### FINDING-40: Shopping/meal link mutations inconsistently use withTimeout

- **Area:** 3 (useAbortController)
- **File(s):** `src/contexts/ShoppingContext.tsx:402-443`, `src/contexts/MealContext.tsx:256-305`
- **Description:** `linkShoppingItemToMeal`/`unlinkShoppingItemFromMeal` and equivalent MealContext methods are inconsistent — some use `withTimeout`, some don't.
- **Risk:** Missing timeout means a slow network could leave the UI appearing responsive while the operation hangs.
- **Recommended fix:** Add `withTimeout` to all mutation methods.

### FINDING-41: CORS wildcard on all edge functions

- **Status: RESOLVED** — All 4 edge functions now use `Access-Control-Allow-Origin: "https://split.xtian.me"` instead of `"*"`.
- **Area:** 11 (Edge function security)
- **File(s):** All 4 edge functions' CORS headers
- **Description:** All functions set `Access-Control-Allow-Origin: "*"`, allowing calls from any website.
- **Risk:** Combined with FINDING-5 (no JWT), any website can invoke these functions. Defense-in-depth concern.
- **Recommended fix:** Restrict to application origin: `Access-Control-Allow-Origin: "https://split.xtian.me"`.

### FINDING-42: No idempotency guard on receipt task processing

- **Status: RESOLVED** — `process-receipt` now checks `task.status !== 'pending'` before processing. Non-pending tasks return 200 with `already_processed: true`. The status update uses conditional `.eq('status', 'pending')` to prevent race conditions.
- **Area:** 11 (Edge function security)
- **File(s):** `supabase/functions/process-receipt/index.ts:76-79`
- **Description:** The function doesn't check current status before marking 'processing'. A completed task could be re-processed, overwriting its data.
- **Risk:** Low — requires knowing the task ID. But could reset a completed task.
- **Recommended fix:** Conditional update: `.update({...}).eq('id', id).eq('status', 'pending')`.

### FINDING-43: Admin password hint exposes actual password in dev

- **Status: RESOLVED** — See FINDING-2. The entire password-based system was removed. No password, no hint function.
- **Area:** 10 (adminAuth)
- **File(s):** `src/lib/adminAuth.ts:56-61`
- **Description:** `getAdminPasswordHint()` returns the actual password string in dev mode. If tree-shaking fails, this could leak into production.
- **Risk:** Defense-in-depth concern. Vite should strip this.
- **Recommended fix:** Remove or return a static hint instead.

### FINDING-44: Async errors not caught by ErrorBoundary (by design)

- **Area:** 14 (ErrorBoundary coverage)
- **File(s):** `src/main.tsx:6-25`
- **Description:** React ErrorBoundary only catches synchronous render errors. Unhandled promise rejections are caught by `window.addEventListener('unhandledrejection')` and logged to Grafana but provide no UI recovery. All contexts wrap async operations in try/catch, making this defense-in-depth.
- **Risk:** Edge-case unhandled rejections are logged but invisible to users.
- **Recommended fix:** Acceptable as-is. Consider a global toast for unhandled rejections.

---

## Clean Areas

### Area 8 — Real-time subscription lifecycle (mostly clean)
- The duplicate-insert guard exists and works correctly (line 114-116 of ShoppingContext)
- No other context uses real-time subscriptions — confirmed across all 11 contexts
- Subscription cleanup via the returned closure is correct
- Only minor issues: stale closure (dead code path) and StrictMode double-mount (dev only)

### Area 9 — SessionHealthGate and StaleSessionOverlay (fully clean)
- Clean separation of concerns: SessionHealthGate orchestrates, StaleSessionOverlay presents, useSessionHealth contains all logic
- No duplicated logic between the three layers
- Auth-error trigger path correctly hardened after PR #288 (double-gate: bus event → token expiry check → refresh attempt → overlay)
- Only one SessionHealthGate instance exists (in App.tsx); no possibility of overlapping auth UI
- Children stay mounted when overlay shows (preserves form data)

### Area 5 — Optimistic rollback (mostly clean, not as documented)
- Despite CLAUDE.md stating "state is NOT rolled back for most operations," most contexts are actually **server-first** (update state only after DB success), making rollback moot
- ShoppingContext's `toggleItemCompleted` correctly implements optimistic update with proper rollback
- Only ShoppingContext.deleteShoppingItem has a partial-failure data corruption risk (FINDING-17)

---

## Recommended Fix Priority Order

### Tier 1 — Security (fix before any feature work) ✅ ALL RESOLVED
1. **FINDING-5:** ✅ JWT verification on all 4 edge functions + shared `_shared/auth.ts`
2. **FINDING-6:** ✅ HTML-escape user strings in email templates (`escapeHtml()`)
3. **FINDING-2/3/43:** ✅ Admin auth replaced with Supabase user ID allowlist
4. **FINDING-4:** ✅ (partial) Trips RLS: writes restricted to creator; reads still open for shared links
5. **FINDING-16:** ✅ Client-side 5MB + server-side 10MB image size limits
6. **FINDING-20/42:** ✅ Ownership check + idempotency guard in process-receipt
7. **FINDING-41:** ✅ CORS restricted to `https://split.xtian.me` on all edge functions

### Tier 2 — Data integrity (fix soon) ✅ ALL RESOLVED
7. **FINDING-7:** ✅ Enhance withTimeout to abort the controller on timeout
8. **FINDING-8/9:** ✅ Add client-generated UUIDs + ref-based submit guards on all forms
9. **FINDING-17:** ✅ Fix shopping item delete partial-failure (reverse operation order or use transaction)
10. **FINDING-14:** ✅ Reset `hasInitialized` on user identity change in UserPreferencesContext

### Tier 3 — Reliability (fix in normal sprint) ✅ ALL RESOLVED
11. **FINDING-1:** ✅ Wire up ErrorBoundary in App.tsx
12. **FINDING-10:** ✅ Add error surfacing (toast or state) to Shopping/Meal/Activity/Stay contexts
13. **FINDING-13:** ✅ Add else-branch state clearing to 5 contexts on trip change
14. **FINDING-11:** ✅ Fix wrong localStorage key in ManageTripPage
15. **FINDING-12:** ✅ Fix old key check in UserPreferencesContext loading state
16. **FINDING-15:** ✅ Add abort controller and cancelled guard to useMyTripBalances
17. **FINDING-27:** ✅ Add client-side fallback for orphaned receipt_tasks
18. **FINDING-26:** ✅ Clear trips on user identity change

### Tier 4 — Cleanup (nice to have)
19. **FINDING-18:** ✅ Remove dead Zustand store and dependency
20. **FINDING-19:** Add max entries to myTrips/mutedTrips localStorage
21. **FINDING-37:** Standardize localStorage key naming
22. **FINDING-36:** Add schema versioning to localStorage entries
23. **FINDING-31:** ✅ Improve ErrorBoundary with retry limit and navigation fallback
24. **FINDING-35:** ✅ Zustand/defaultTripId overlap (resolved via FINDING-18)
