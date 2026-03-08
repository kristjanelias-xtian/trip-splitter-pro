# PWA (Progressive Web App) — Detailed Reference

> Summary lives in `CLAUDE.md`. This file has the full implementation details.

## Three-Layer `start_url` Fix

iOS Safari ignores `manifest.start_url` and saves whatever URL was in the address bar at install time. All three layers are needed because iOS is inconsistent about which defense fires across versions.

### 1. Manifest (`public/manifest.webmanifest`)

Standard PWA manifest: `start_url: "/"`, `scope: "/"`, `display: "standalone"`, theme color `#e8613a`. Icons: 16px, 32px, 180px (apple-touch-icon), 512px. Referenced in `index.html` `<head>`.

### 2. Service Worker (`public/sw.js`)

Minimal SW focused on one job: intercept home screen launches into `/t/...` deep links and redirect to `/`. Uses `sec-fetch-dest: document` + no-referrer heuristic to detect standalone launches. `skipWaiting()` + `clients.claim()` for immediate activation.

Registered via inline `<script>` in `index.html` (not via Vite — must be at `/sw.js`).

### 3. Client-Side Guard (`src/main.tsx`)

Fallback for when the SW doesn't fire (common on iOS). Before `ReactDOM.createRoot`, checks `navigator.standalone` (iOS) or `display-mode: standalone` media query. If standalone + pathname starts with `/t/`, calls `window.location.replace('/')` — React never renders the wrong route.

## Smart Install Guide (`src/components/InstallGuide.tsx`)

`usePWAInstall` hook (`src/hooks/usePWAInstall.ts`) detects mobile, standalone mode, and engagement (2+ visits via localStorage counter). Two variants:
- **`variant="banner"`** — shown on `HomePage` for engaged mobile users who haven't installed yet; dismissible
- **`variant="settings"`** — always available in `ManageTripPage`

Platform-specific instructions (iOS: Share → Add to Home Screen; Android: menu → Add to Home screen).

## Admin in PWA

Shield icon button in both Layout and QuickLayout headers — visible to admin user in both browser and standalone PWA mode, navigates to `/admin/all-trips`. In standalone PWA mode, `AdminAllTripsPage` uses `navigate()` instead of `window.open(_blank)` to load trips (new browser contexts in standalone trigger the SW/client guard redirect). Mobile-responsive: card layout at < lg, table at >= lg.

## Safe-Area Padding (iPhone home indicator)

In PWA standalone mode, the bottom tab bar needs safe-area padding so the iPhone home indicator doesn't overlap tap targets. `viewport-fit=cover` on the viewport meta enables `env(safe-area-inset-bottom)`. CSS utility `pwa-safe-bottom` in `index.css` is scoped to `@media (display-mode: standalone)` — regular browser is unaffected. Applied to bottom nav and main content margin in `Layout.tsx`.

## Pull-to-Refresh (`usePullToRefresh`)

In standalone PWA mode there's no address bar or refresh button. A custom pull-to-refresh gesture provides a native-feeling way to reload data.

### Architecture

`PullToRefreshProvider` (wraps each layout) stores the current page's refresh callback in a ref. Pages register their callback via `useRegisterRefresh(useCallback(...))`. The `usePullToRefresh` hook in each layout handles touch gestures and calls the registered callback.

### Gesture Behaviour

- Only activates in standalone PWA mode (`display-mode: standalone` / `navigator.standalone`) — regular browsers have native refresh; touch listeners are not registered at all outside standalone mode
- Only activates when `window.scrollY <= 0` (at scroll top)
- Ignores horizontal swipes (direction locked on first significant movement)
- Skips when any Radix sheet/dialog is open (`document.querySelector('[role="dialog"][data-state="open"]')`)
- Rubber-band resistance: `deltaY * 0.5`, capped at 120px. Threshold to trigger: 80px.
- `touchmove` uses `passive: false` + `preventDefault()` during pull to suppress native iOS bounce and Chrome PTR
- `overscroll-behavior-y: none` on body in `index.css` disables Chrome Android's native PTR

### Indicator

`PullToRefreshIndicator` at top of `<main>` — `ArrowDown` icon rotates 0-180deg proportional to progress; `Loader2` spinner during refresh. Transitions disabled during active drag for instant finger tracking.

### Page Refresh Callbacks

| Page | Callback |
|------|----------|
| HomePage | `refreshTrips()` |
| QuickGroupDetailPage | `refreshParticipants + refreshExpenses + refreshSettlements` |
| ExpensesPage | `refreshExpenses()` |
| SettlementsPage | `refreshParticipants + refreshExpenses + refreshSettlements` |
| DashboardPage | `refreshParticipants + refreshExpenses + refreshSettlements` |
| ShoppingPage | `refreshShoppingItems()` |
| PlannerPage | `refreshMeals + refreshActivities + refreshStays` |
