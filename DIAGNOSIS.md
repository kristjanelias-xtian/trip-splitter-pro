# DIAGNOSIS: Client-Side Freeze After Session Refresh

## Root Cause (One Sentence)

The `onAuthStateChange` callback in `AuthContext.tsx` `await`s Supabase DB queries (`fetchProfile()`, `upsertProfile()`) while the Supabase auth lock is held, creating a circular deadlock because those queries call `getSession()` which tries to re-acquire the same lock.

## Detailed Sequence of Events

### Normal startup (no deadlock)

1. Module loads → `createClient()` → GoTrueClient constructor → `initialize()` starts
2. `initialize()` runs in microtask queue → `_recoverAndRefresh()` → `_notifyAllSubscribers('SIGNED_IN')` if token valid
3. At this point, **`onAuthStateChange` is not yet registered** — React's `useEffect` hasn't run
4. `_notifyAllSubscribers` has zero subscribers → returns immediately
5. Lock released → `initializePromise` resolves
6. React `useEffect` runs → `getSession()` resolves → profile fetched (no lock held) → app works

### Deadlock scenario (after stale session refresh)

1. App is running. `onAuthStateChange` subscription IS registered (from step 6 above)
2. Token approaches expiry or 401 detected → `useSessionHealth.tryRefreshThenExpire()` fires
3. `supabase.auth.refreshSession()` is called
4. `refreshSession()` → `_acquireLock(-1, callback)` → **auth lock acquired**
5. Inside lock: `_refreshSession()` → `_callRefreshToken(refresh_token)` → network call → success
6. `_callRefreshToken` calls `_notifyAllSubscribers('TOKEN_REFRESHED', newSession)`
7. `_notifyAllSubscribers` iterates subscribers and **awaits** each callback
8. **AuthContext's callback fires** (within the held lock):
   ```
   setSession(newSession)  // sync — fine
   setUser(newSession.user) // sync — fine
   await fetchProfile(newSession.user.id) // ← DEADLOCK TRIGGER
   ```
9. `fetchProfile()` → `supabase.from('user_profiles').select(...)` → PostgREST query
10. PostgREST query → `fetchWithAuth()` → **`await _getAccessToken()`**
11. `_getAccessToken()` → **`await this.auth.getSession()`**
12. `getSession()` → `await initializePromise` (resolved ✓) → `_acquireLock(-1, ...)`
13. **Lock IS held** (by step 4) → re-entrant path:
    ```js
    const last = this.pendingInLock[this.pendingInLock.length - 1]
    const result = (async () => {
      await last  // ← waits for the outer lock's work to complete
      return await fn()
    })()
    ```
14. `last` = the outer lock's promise = step 5's work = waiting for `_notifyAllSubscribers` = waiting for AuthContext callback = waiting for `fetchProfile()` = waiting for `getSession()` = **step 13**

**Circular wait → permanent deadlock.**

### Why retrying doesn't help

The auth lock is held forever. Every new Supabase query (from any context) goes through `fetchWithAuth` → `_getAccessToken()` → `getSession()` → tries to acquire the lock → queues behind the deadlocked operation → also hangs.

### Why page refresh fixes it

`window.location.reload()` destroys the entire JS runtime. A fresh `createClient()` creates a new lock with `lockAcquired = false`. No deadlock.

### Why trips still display

TripContext loaded trips BEFORE the token refresh. Its `useEffect` depends on `user?.id`, which didn't change (same user, new token). The trips in state are stale-but-valid. Only NEW queries (navigating into a group → ParticipantContext, ExpenseContext, SettlementContext mount and fetch) deadlock.

## Evidence Supporting This Diagnosis

| Symptom | Explanation |
|---------|-------------|
| Network tab: 0 real requests | Queries stuck at `_getAccessToken()` → never reach `fetch()` |
| All contexts timeout simultaneously | ALL queries route through the same `_getAccessToken()` → same lock |
| Only happens after "session stale" | Manual `refreshSession()` triggers the lock-holding code path |
| Works on initial load | `onAuthStateChange` subscription not registered during `_recoverAndRefresh()` |
| Retry doesn't help | Lock is permanently held — new queries queue behind it |
| Full refresh fixes it | New JS runtime, new client, new lock state |

## The Specific Code Location

**File**: `src/contexts/AuthContext.tsx`, lines 108–133

```tsx
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, newSession) => {                    // ← async callback
    // ...
    if (newSession?.user) {
      if (event === 'SIGNED_IN') {
        const profile = await upsertProfile(newSession.user)  // ← Supabase query while lock held
        setUserProfile(profile)
      } else {
        const profile = await fetchProfile(newSession.user.id) // ← Supabase query while lock held
        setUserProfile(profile)
      }
    }
  }
)
```

The Supabase auth client holds a lock during `_notifyAllSubscribers`, which `await`s each subscriber callback. The `async` callback above `await`s DB queries that need the same lock → deadlock.

## Why Previous Fixes Didn't Work

- **PR #234 (abort controllers)**: Added abort signals to all queries, but the issue is queries never reaching `fetch()` — they're stuck at the lock, before any signal matters
- **PR #249 (session health)**: Added `sessionHealthBus` + `StaleSessionOverlay` — this actually INTRODUCED the trigger by calling `refreshSession()` manually
- **PR #272 (silent refresh)**: Added `supabase.auth.refreshSession()` in `useSessionHealth` — this is the direct trigger for the deadlock, but the underlying bug (async Supabase calls in `onAuthStateChange`) was there since the beginning
- **Custom lock bypass** (`src/lib/supabase.ts`): Bypasses `navigator.locks` correctly, but the re-entrant `pendingInLock` queue inside `_acquireLock()` creates a different form of serialization that still deadlocks

## Fix

Remove `await`ed Supabase DB queries from the `onAuthStateChange` callback. Defer profile operations to `setTimeout(fn, 0)` so they execute in the next macrotask, after the auth lock is released.

For `TOKEN_REFRESHED` events specifically, no profile fetch is needed at all — the user data hasn't changed, only the access token.

## Secondary fixes (PR #288)

- 403 responses no longer trigger `auth-error` bus event (permissions issue, not token expiry)
- `auth-error` handler now checks token expiry before attempting refresh — a 401 with a valid token (e.g. RLS rejection, race condition) is logged and ignored
- 30-second cooldown added between refresh attempts to prevent rapid sequential calls
- `updateBankDetails` timeout reduced from 35s to 10s (consistent with other contexts)
