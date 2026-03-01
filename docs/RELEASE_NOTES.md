# Release Notes

## v1.1.0 — March 2026

### PWA
- Installable with smart install guide — banner on home page + settings variant (#442)
- Service worker + client-side guard — always launches to home, not stale deep links (#444)
- Safe-area padding for iPhone home indicator in standalone mode (#460)
- Pull-to-refresh gesture in standalone PWA — rubber-band with per-page refresh callbacks (#474, #476)
- Admin nav works in installed PWA — `navigate()` instead of `window.open` (#445, #453)

### Contact Autocomplete
- "People you've tripped with" — deduplicated contacts from past trips (#464)
- Google display names for linked Spl1t accounts (#465)
- Dedup fixes and dropdown UX improvements (#467, #470)
- Collapsible "Recent" contacts list in both Quick and Full mode (#472)

### Invite UX
- Per-participant "Send invite" button on participant list, removed from add flow (#477)
- Auto-populate participant email on "This is me" linking (#478)
- Branded coral email templates with Spl1t wordmark header (#469)

### Balance & Settlement
- "Out of pocket" replaces "Total paid" on BalanceCard (#423, #424)
- Always-visible "Settled" row for consistent card heights (#425)
- Within-group balance fixes — correct per-member totals + all settlements applied (#427, #429, #438)

### Expenses
- "Paid by" participant filter on ExpensesPage (#432)
- Category filter icon alignment (#435)
- Pie chart category color fix (#437)

### Demo Trip
- Seeded `livigno-2025` — 6 participants (2 couples + 2 solo), 13 expenses, EUR 4,004.80 (#430)
- "Try a demo" link on home page (#431, #433)
- Balance audit script for production trip integrity checks (#439)

### Admin & Security
- Trip deletion gated to creator or admin UUID (#436)
- Responsive admin page — card layout on mobile, table on desktop (#453)

### Navigation & UX
- Back arrow in Full mode header, matching Quick mode (#452)
- Auto-redirect only for trips happening now (today within start/end dates) (#449)
- Bottom nav hidden on home page (#441)
- Quick history hint for discoverability (#461)
- Bank details gated to payers only, duplicate demo link removed (#481)

### Testing
- 173 unit tests (up from 145 in v1.0.0), 26 E2E unchanged

---

## v1.0.0 — February 26, 2026

### AI Receipt Scanning
- **Scan → extract → review → split workflow** — Capture a receipt photo, AI extracts line items, tap chips to assign participants per item, confirm and create the expense.
- **Claude vision (Sonnet) for line-item extraction** — Edge function processes receipt images with structured JSON output.
- **Currency mismatch detection** — Prompts for exchange rate when receipt currency differs from trip default.
- **Receipt image storage** — Uploaded to Supabase Storage with signed URL thumbnails on the expenses list.
- **Pending receipt banner** — Shows on Expenses and Quick pages while a receipt is being processed.

### Email & Invitations
- **Resend integration** — `send-email` edge function for transactional email delivery.
- **Event invitations with magic links** — `/join/:token` deep links for one-tap trip access.
- **Payment reminder emails** — Manual trigger per settlement with inline amount and bank details.
- **Receipt reminder emails** — HTML tables with line-item breakdown and debtor item highlighting.

### Family / Group Splitting
- **Wallet groups** — Group participants who share a wallet (replaces the old families entity model).
- **Per-expense "Split equally between groups" toggle** — OFF = per-person split, ON = equal per group regardless of size.
- **Within-group balance view** — Settlements page shows intra-group debts with a dedicated toggle.
- **Children's balances folded into adults** — Automatically distributed equally among adult group members.
- **Simplified distribution model** — From 2 distribution types down to 1 (individuals with optional wallet_group).

### Unified UX
- **Single home page for both modes** — Quick and Full share one unified home with greeting, scan CTA, and trip cards.
- **Bottom sheet standard** — All 11 sheets follow one structural pattern (sticky header, scrollable content, optional footer).
- **Quick actions as overlays** — Add expense, Scan, Settle, and History open as sheets (mobile) or dialogs (desktop).
- **Consistent loading/error states** — All 9 trip-scoped pages use the same skeleton and error patterns.
- **Mode toggle from current route** — Derives effective mode from pathname, not stored preference.
- **Two-row mobile header** — Scan / Manage / mode pills in a grid below the trip name.
- **Unified trip cards** — Balance display with trip dates on the home page.

### Events (not just Trips)
- **Trip vs. Event type selector** — Choose at creation time; events default to a single date with planner features off.
- **Dynamic labels** — "Manage Trip" / "Manage Event" and other labels adapt based on type.

### iOS & Mobile
- **Top-based sheet positioning** — Sheets anchor to `visualViewport.offsetTop` when keyboard opens (no more content behind keyboard).
- **Numpad keyboard support** — Handles taller numpad via `viewportOffset` so headers stay visible.
- **Decimal comma input** — European locale support with `inputMode="decimal"` and comma-to-dot replacement.
- **dvh units everywhere** — Replaced all `vh` with `dvh` for correct iOS viewport sizing.

### Security & Reliability
- **Admin auth hardened** — Moved from password check to Supabase user ID allowlist.
- **Per-operation RLS policies** — SELECT open (trip URL = access token), INSERT/UPDATE/DELETE restricted by auth.
- **JWT verification on edge functions** — All edge functions validate the auth token.
- **CORS restricted to production domain** — Edge functions only accept requests from the deploy origin.
- **Auth deadlock fix** — Never `await` DB queries inside `onAuthStateChange` (deferred with `setTimeout`).
- **Timeout standardization** — 15s for queries, 55s for uploads, with fetch-level abort as backstop.
- **ErrorBoundary with retry** — Catches render crashes with "Retry" and "Go home" fallback actions.
- **Session health detection** — `StaleSessionOverlay` prompts refresh on expired sessions.
- **Idempotent mutations** — Client-side UUID for expense/settlement creation prevents duplicates.
- **Ref-based submit guards** — Prevents double-tap on all form submissions.
- **HTML escaping in emails** — Sanitized user content in all outbound email templates.
- **Image size limits** — 5 MB client-side, 10 MB server-side validation.

### Observability
- **Grafana Cloud integration** — Loki logs + OTLP metrics routed through `log-proxy` edge function.
- **Offline log buffering** — Failed log entries saved to localStorage, replayed on recovery.
- **Debug logger** — `localStorage.setItem('spl1t_debug', 'true')` enables production diagnostics.

### Testing
- **145 unit tests** — Vitest + Testing Library covering contexts, hooks, and key pages.
- **26 E2E smoke tests** — Playwright across 13 routes × 2 viewports (mobile + desktop), Supabase fully mocked.
- **Production smoke test suite** — 8 interactive scenarios against the live deployment.

### Other
- **Rebrand to Spl1t** — New name, logo, and favicon (split-S letter mark).
- **Marketing landing page** — Self-contained `public/marketing.html`.
- **Scan-first onboarding** — Zero-group state opens camera directly; 1+ groups shows trip picker.
- **Quick-mode event creation** — Full trip/event setup via bottom sheets without leaving Quick mode.
- **PDF and Excel export** — Download expense reports from the dashboard.
- **Meal + activity planner** — Week-based calendar with breakfast/lunch/dinner and morning/afternoon/evening slots.
- **Shopping list** — Real-time collaborative list with categories, linked to meals.
- **Stay tracker** — Accommodation management with check-in/out dates and map coordinates.

---

## v0.9.3 — February 14, 2026

- **Quick mode: Smart settlement suggestions** — "Log your payment" now shows suggested payments (computed from the optimizer) before the form, so you know exactly who owes whom and how much.
- **Quick mode: Payer auto-select** — When adding an expense, the payer is automatically set to the logged-in user.
- **Quick mode: Dual-currency display** — Transaction history shows both the base currency amount and the original currency amount.
- **Rebrand to Spl1t** — The app has been renamed from "Trip Splitter Pro" to "Spl1t".
- **Shared link fixes** — Shared trip links now open in the correct mode; mode toggle responds correctly after redirect.
- **Feedback improvements** — Added screenshot attachment support in the feedback dialog; "Report issue" button is hidden for anonymous users.
- **UI fixes** — Fixed Top Expenses alignment on narrow viewports.
