# PLAN.md — Spl1t Feature Planning Document

> **Living document.** Update at the start and end of every session.
> Last updated: 2026-02-23 (Phases 1–6 ✅ done; iOS user issue triage PRs #268–#278, 15 issues resolved; auth deadlock fix; auth-error hardening PR #288; full mode header redesign + bug button restore PR #290)

---

## 1. Current State Summary

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite 6 |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| State | React Context API (one provider per domain) |
| Database | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage (`feedback-screenshots` bucket, public) |
| Edge Functions | Supabase Edge Functions (Deno) — `log-proxy`, `create-github-issue` |
| Auth | Supabase Auth (Google OAuth, implicit flow) |
| Observability | Grafana Cloud — Loki (logs) + OTLP (metrics) via `log-proxy` |
| Deployment | Cloudflare Pages |
| Tests | Vitest + Testing Library (139 unit tests, all passing), Playwright (26 E2E smoke tests) |
| AI SDK | `@anthropic-ai/sdk@0.32.1` — **already installed, not yet used** |
| PDF Export | jsPDF + jspdf-autotable |
| Maps | Leaflet + react-leaflet |
| Charts | recharts |
| Animation | framer-motion |

### Architecture Overview
- **Two UI modes**: Full (multi-page: Trips → select → Expenses/Settlements/Planner/Shopping/Dashboard) and Quick (single-trip streamlined view)
- **Layout**: `Layout.tsx` (full), `QuickLayout.tsx` (quick) — each wraps all trip-scoped context providers
- **Context tree** (outer → inner): `AuthProvider` → `SessionHealthGate` → `TripProvider` → `UserPreferencesProvider` → (route) → `ParticipantProvider` → `ExpenseProvider` → `SettlementProvider` → `MealProvider` → `ActivityProvider` → `StayProvider` → `ShoppingProvider`
- **Routing**: React Router v6, trip-scoped routes under `/t/:tripCode/...`
- **Mobile wizard**: `ExpenseWizard.tsx` routes to `MobileWizard` (bottom Sheet, 4 steps) on mobile, `ExpenseForm` (Dialog) on desktop/edit

### Key Files
```
src/
  App.tsx                         # Root: providers + router
  routes.tsx                      # All routes
  types/
    trip.ts                       # Trip, CreateTripInput, UpdateTripInput
    expense.ts                    # Expense, SplitMode, distribution types
    participant.ts                # Participant, Family
    auth.ts                       # UserProfile
    stay.ts, activity.ts, meal.ts, shopping.ts
  contexts/
    AuthContext.tsx                # Session, userProfile, bankDetails
    TripContext.tsx                # Trip CRUD, active trip
    ExpenseContext.tsx             # Expense CRUD
    ParticipantContext.tsx         # Participants + families
    SettlementContext.tsx          # Settlement CRUD
    UserPreferencesContext.tsx     # mode (quick/full), defaultTripId
  components/
    Layout.tsx                    # Full-mode layout (header, nav, sidebar)
    QuickLayout.tsx               # Quick-mode layout
    expenses/
      ExpenseWizard.tsx           # Routes to MobileWizard or ExpenseForm
      ExpenseForm.tsx             # Desktop/edit form
      wizard/
        WizardStep1.tsx           # Description + Amount + Currency
        WizardStep2.tsx           # Who paid?
        WizardStep3.tsx           # Split between whom?
        WizardStep4.tsx           # Advanced (date, category, comment)
    quick/
      QuickExpenseSheet.tsx       # Quick mode add expense entry point
      QuickSettlementSheet.tsx    # Quick mode settlement view
  services/
    balanceCalculator.ts          # Balance calculation (individuals/families/mixed)
    excelExport.ts                # Excel export
    tripGradientService.ts        # Decorative trip header gradients
  lib/
    supabase.ts                   # Supabase client (with timeout wrapper)
    logger.ts                     # Grafana-backed logger with localStorage buffer
    fetchWithTimeout.ts           # withTimeout() helper
supabase/
  migrations/                     # 001–018 SQL migrations
  functions/
    log-proxy/                    # Logs → Grafana Loki
    create-github-issue/          # Feedback → GitHub issues
    _shared/                      # Shared logger + metrics (Deno)
index.html                        # <title>Split</title>
```

### Current Data Model (key tables)
```
trips         — id, trip_code, name, start_date, end_date, tracking_mode,
                default_currency, exchange_rates, enable_meals, enable_activities,
                enable_shopping, default_split_all, created_by, created_at
participants  — id, trip_id, family_id, name, is_adult, user_id
families      — id, trip_id, family_name, adults, children
expenses      — id, trip_id, description, amount, currency, paid_by,
                distribution JSONB, category, expense_date, comment, meal_id
settlements   — id, trip_id, from_participant, to_participant, amount, date
user_profiles — id (auth.uid), display_name, email, avatar_url, bank_account_holder, bank_iban
user_preferences — id (auth.uid), preferred_mode, default_trip_id
stays         — id, trip_id, name, link, comment, check_in_date, check_out_date, lat, lng
activities    — id, trip_id, date, time_slot, title, link, responsible_participant_id
meals         — id, trip_id, date, meal_type, name, responsible_participant_id, status
shopping_items — id, trip_id, description, is_completed, category, quantity
```

### Existing Storage / File Upload Pattern
- **Bucket**: `feedback-screenshots` (public) — used by `ReportIssueDialog.tsx`
- **Pattern**: canvas-compress → `supabase.storage.from(bucket).upload(name, blob, { contentType })` → `getPublicUrl(path)`
- Image compression already implemented (canvas, max 1200px wide, 80% JPEG quality)
- **No receipts bucket yet** — needs to be created for AI Receipt Reader

### Existing Email Infrastructure
- **None.** No email service is integrated.
- User emails are stored in `user_profiles.email` and `auth.users`
- The `ShareTripDialog` uses `mailto:` links (opens native mail app)
- There is an `ACCESS_CONTROL.md` planning doc that references invitations, but nothing implemented

---

## 2. Feature Backlog

| # | Feature | Status | Blocked By |
|---|---------|--------|-----------|
| A | Rebrand to "Spl1t" | ✅ Done (PR #140) | — |
| B | Events (not just Trips) | ✅ Done (PR #141) | — |
| C | Email & Invitations | ✅ Done (PRs #198–#200) | — |
| D | AI Receipt Reader | ✅ Done (PR #149) | — |

---

## 3. Feature Analysis

---

### A. Rebrand to "Spl1t"

**Every place the name "Split" appears in user-facing strings:**

| File | Line | Current Text | Type |
|------|------|-------------|------|
| `index.html` | 7 | `<title>Split</title>` | Page title (browser tab) |
| `src/components/Layout.tsx` | 168 | `alt="Split"` on logo img | Logo alt text |
| `src/components/Layout.tsx` | 170 | `Split` (h1 text) | Full-mode header wordmark |
| `src/components/QuickLayout.tsx` | 73 | `alt="Split"` on logo img | Logo alt text |
| `src/components/QuickLayout.tsx` | 75 | `Split` (h1 text) | Quick-mode header wordmark |
| `src/pages/HomePage.tsx` | 50 | `Family Trip Cost Splitter` | Old full-mode home page title |
| `src/pages/HomePage.tsx` | 53 | `Split costs fairly among groups...` | Sub-tagline |
| `src/pages/QuickGroupDetailPage.tsx` | ~151 | `"Split a bill with the group"` | Button description |
| `src/pages/ManageTripPage.tsx` | ~116, 314 | `"Split between everyone"` | Feature label |
| `src/services/excelExport.ts` | 51 | `'Split With'` | Excel column header |
| `public/logo.png` | — | Logo image file | Visual asset (may need redesign) |
| `public/favicon.png` | — | Favicon | Visual asset |
| `package.json` | 2 | `"name": "trip-splitter-pro"` | Internal only, not user-facing |
| `src/lib/userPreferencesStorage.ts` | 6 | `'trip-splitter:user-preferences'` | localStorage key — **breaking if changed** |
| `src/lib/adminAuth.ts` | 8 | `'trip-splitter:admin-auth'` | localStorage key — **breaking if changed** |
| `src/lib/logger.ts` | — | `'trip-splitter:failed-logs'` | localStorage key — **breaking if changed** |

**Notes on localStorage keys**: These are internal keys not visible to users. Changing them would break existing sessions (preferences lost). Can be migrated with a one-time read-old-write-new pattern or left as-is.

**Decision needed from you**: Should "Spl1t" replace ALL instances of "Split" (including functional labels like "Split With", "Split between everyone") or only the brand name / wordmark?

---

### B. Events (not just Trips)

**Problem with current model**: `trips.start_date` and `trips.end_date` are both required. The planner, calendar view, and stay tracking are all tied to a date range. A "team dinner" or one-off event doesn't fit this model well.

**Option 1: Unified model with `event_type` field (Recommended)**

Add a column `event_type TEXT NOT NULL DEFAULT 'trip' CHECK (event_type IN ('trip', 'event'))` to the `trips` table. For `event_type = 'event'`, make `end_date` nullable (or default it to `start_date`). Hide planner/meals/shopping features for single events.

Pros:
- All existing expense, settlement, participant, balance logic works unchanged
- One context (TripContext), one route structure, one type system
- Events immediately support everything trips support (currencies, tracking modes, bank details)
- Minimal migration

Cons:
- Slightly awkward naming (we'd want to rename the `trips` table to `events` eventually, but that's a bigger migration)
- The `Trip` type name in TypeScript would become stale — either rename it (`Event`) or keep as internal name

**Option 2: Separate `events` table**

Pros: Cleaner semantic model, no nullable dates on trips
Cons: Duplicates all FK relationships (expenses, settlements, participants, etc.), doubles migration complexity, requires two separate contexts or a big refactor

**Recommendation**: Option 1. Add `event_type` field, make `end_date` nullable, add `duration_type` to the UI labels. The "Event" concept becomes a display/UX concern, not a data model concern. In TypeScript we can introduce a `Event = Trip` alias or rename the type.

**UI changes needed**:
- "Create New Trip" → "Create New Event" (or modal lets user choose type)
- Form: for `event_type = 'event'`, show only a single date (not date range)
- Trip cards should show type badge ("Trip" / "Event")
- Planner, Shopping, Meals tabs hidden for events

**Migration**: `ALTER TABLE trips ADD COLUMN event_type TEXT NOT NULL DEFAULT 'trip'`

---

### C. Email & Invitations

**Existing infrastructure**: None. The `ShareTripDialog` uses `mailto:` links only.

**Recommended service**: **Resend** (resend.com)
- Modern REST API, excellent TypeScript SDK
- React Email for HTML templates (matches our React stack)
- Works perfectly as a Supabase Edge Function dependency (Deno-compatible via npm specifier)
- Free tier: 3,000 emails/month, 100/day — sufficient for early stage
- No SMTP setup needed, just an API key
- Alternatives considered: SendGrid (more complex, enterprise-focused), Postmark (good but fewer free emails), Mailgun (older API)

**Data model changes needed**:

```sql
-- New table: invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,                           -- Optional display name for the invitee
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  token TEXT NOT NULL UNIQUE,          -- UUID token for accept link (no auth required)
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table: email_log (audit trail)
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,            -- 'invitation', 'payment_reminder', 'receipt_reminder'
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  resend_message_id TEXT,              -- ID from Resend API for tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB                       -- e.g. { receipt_url, amount_owed }
);
```

**New Edge Function needed**: `send-email` (calls Resend API)

**Three email types to support**:
1. **Event invitation** — sent when organiser adds participants by email at event creation
2. **Payment reminder** — sent manually or auto-triggered; shows what the recipient owes and to whom
3. **Receipt reminder** — payment reminder with a receipt image attached (from AI Receipt Reader)

**Flow for invitations**:
1. At trip creation (or manage trip page), organiser enters participant emails
2. System creates `invitations` row + calls `send-email` edge function
3. Email contains a magic link: `https://app.spl1t.com/join/:token`
4. Recipient opens link → account auto-linked to participant record if they sign in
5. Invitation status updated to `accepted`

**Open question**: Should invitations require the invitee to sign up for an account, or just view the trip (current behaviour — anyone with the link can view)?

---

### D. AI Receipt Reader

**Approach**: Claude vision API via a Supabase Edge Function (`process-receipt`). Never call the Anthropic API directly from the browser — the API key must stay server-side.

**New storage bucket needed**: `receipts` (private, authenticated users only)

**New database table**:

```sql
CREATE TABLE receipt_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'review', 'complete', 'failed')),
  receipt_image_path TEXT,             -- Storage path in 'receipts' bucket
  receipt_image_url TEXT,              -- Signed URL (refreshed on read)

  -- AI extraction results
  extracted_items JSONB,               -- [{ name, price, quantity }]
  extracted_total NUMERIC(10,2),       -- Total the AI read from the receipt

  -- User-reviewed values
  confirmed_total NUMERIC(10,2),       -- User-confirmed actual total
  tip_amount NUMERIC(10,2) DEFAULT 0,

  -- Item-to-participant mapping (user assigns)
  mapped_items JSONB,                  -- [{ item_index, participant_ids[] }]

  -- Resulting expense (set when complete)
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**End-to-end flow**:

```
Step 1: Entry point
  User taps "Add Expense" → sees two options:
    [Manual Entry]  [Scan Receipt] (camera icon)

Step 2: Capture / upload
  Camera sheet opens (mobile) or file picker (desktop)
  User photographs or uploads receipt image
  Image compressed client-side (same pattern as ReportIssueDialog)
  Uploaded to 'receipts' bucket → receipt_task row created (status: 'pending')

Step 3: AI processing (async, non-blocking)
  Edge function `process-receipt` invoked
  Calls Claude vision (claude-3-5-sonnet or claude-3-5-haiku) with:
    - System prompt describing expected JSON output format
    - Receipt image (base64 or URL)
  Returns: { items: [{name, price, qty}], total, currency }
  Saves to receipt_tasks.extracted_items + extracted_total
  Updates status: 'processing' → 'review'

Step 4: Deferred review (the "pending" flow)
  If user exits before reviewing, task stays in 'review' state
  Pending tasks shown as a banner/card on the Expenses page
    "You have 1 unreviewed receipt" → tap to resume
  QuickHomeScreen also shows pending task count badge

Step 5: Review & correct
  User sees extracted line-item table
  Each item: name, price, quantity (all editable inline)
  User confirms or corrects total
  User enters tip amount (optional)

Step 6: Item-to-participant mapping (hardest UX problem)
  RECOMMENDED PATTERN: "Person Pile" swipe UI
    - Bottom of screen: row of participant avatar chips
    - Items listed as cards (one at a time, swipeable)
    - User taps participant chip(s) to assign item
    - Progress bar shows: "3 of 7 items assigned"

  Alternative (simpler): Checklist per participant
    - Each participant has a collapsible section
    - Checkboxes for each item
    - Better for many items, lower friction

  DECIDED: Chip-tap pattern (item-centric).
  Each item row shows participant chips inline; tap to toggle.
  "Everyone" shortcut per item for shared items.
  Swipe UI deferred.

Step 7: Validation
  "Assign All" button for items that are split equally
  Sum of all item assignments + tip must equal confirmed_total
  Red validation error if mismatch, "Submit" button stays disabled

Step 8: Submit
  System creates an expense with:
    - description: "Receipt: [merchant name if extracted]"
    - amount: confirmed_total + tip
    - distribution: per-participant breakdown from item mapping
    - category: 'Food' (default, user can change)
  receipt_tasks.status → 'complete', expense_id set
```

**Claude API prompt strategy**:
```
System: You are a receipt parser. Extract all line items from this receipt image.
Return JSON: { "merchant": string, "items": [{"name": string, "price": number, "qty": number}], "subtotal": number, "total": number, "currency": string }
Be precise with numbers. If you cannot read a value, use null.
```

**Edge Function**: `process-receipt`
- Accepts: `{ receipt_task_id }`
- Fetches task, downloads image from storage (signed URL)
- Calls Anthropic API with image + structured prompt
- Updates `receipt_tasks` with extracted data + status = 'review'
- Returns immediately (or can be called in background)

**Security**:
- `ANTHROPIC_API_KEY` stored as Supabase secret (not in env vars accessible to browser)
- RLS on `receipt_tasks`: only `created_by` can read/write their tasks
- Receipts bucket: only authenticated users can read their own files

---

## 4. Open Questions / Decisions Needed

| # | Question | Status | Decision |
|---|----------|--------|----------|
| Q1 | Should "Spl1t" replace ALL "Split" text, or only wordmarks? | ✅ Resolved | Wordmarks only (4 locations) |
| Q2 | Migrate localStorage keys to `spl1t:*`? | ✅ Resolved | Yes — one-time migration on load |
| Q3 | For Events: skip planner entirely, or single-day simplified planner? | ✅ Resolved | Simplified planner, **off by default**, user can toggle on |
| Q4 | For Events: rename TypeScript `Trip` type to `Event`? | ✅ Resolved | Yes — rename throughout codebase for cleanliness |
| Q5 | For invitations: require sign-up to accept, or allow anonymous access? | ✅ Resolved | Anonymous view allowed; Google sign-in optional (links account to participant) — JoinPage (`/join/:token`) |
| Q6 | For invitations: send at creation time, or separately from Manage page? | ✅ Resolved | Both — fires when email is first set in IndividualsSetup / FamiliesSetup (works at creation and from Manage page) |
| Q7 | For payment reminders: manual trigger only, or auto-schedule? | ✅ Resolved | Manual only — "Remind" button per settlement transaction in SettlementPlan |
| Q8 | For AI Receipt Reader: Claude Sonnet or Haiku? | ✅ Resolved | claude-haiku-4-5-20251001 (upgrade to Sonnet if accuracy needs improving) |
| Q9 | For item-to-participant mapping: Checklist or Swipe UI? | ✅ Resolved | Chip-tap (item-centric) |
| Q10 | Should receipt images be stored permanently or auto-deleted? | ✅ Resolved | Images stored in `receipts` bucket as `{task_id}.jpg` (parallel with edge fn, graceful degradation); extracted data persists in DB |

---

## 5. Risks & Dependencies

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Receipt AI accuracy varies (blurry photos, unusual formats) | High | Allow full manual correction in review step; make correction UX excellent |
| Anthropic API key security — never expose to browser | Critical | Route all Claude calls through Supabase Edge Function |
| Email deliverability (invites land in spam) | Medium | Use Resend with custom domain, SPF/DKIM setup |
| Changing localStorage keys breaks existing user preferences | Low | Keep old keys or run one-time migration on load |
| `@anthropic-ai/sdk` currently in `dependencies` (browser bundle) | Medium | Move to edge function only; remove from browser bundle or keep for future |
| `trip_type` field breaks if we rename table to `events` later | Low | Use `event_type` column name, keep table name `trips` for now |

**Feature dependencies**:
- Receipt reminder emails (C) **depend on** AI Receipt Reader (D) — needs `receipt_tasks.id`
- Payment reminder emails (C) are **independent** of D
- All features are **independent** of B (Events)
- Rebrand (A) is fully independent, can be done anytime

---

## 6. Phased Implementation Roadmap

### Phase 1 — Quick wins ✅ Done (PR #140)
**A. Rebrand to "Spl1t"** — wordmarks in Layout.tsx, QuickLayout.tsx, index.html; localStorage key migration

### Phase 2 — Events ✅ Done (PR #141)
**B. Events model** — decisions finalised, ready to implement.

#### Decisions
- `event_type: 'trip' | 'event'` column added to `trips` table (DEFAULT `'trip'`)
- `end_date` stays non-nullable for now; for events, form sets `end_date = start_date` automatically
- TypeScript `Trip` type → **renamed to `Event`** everywhere (~40+ files)
- `CreateTripInput` → `CreateEventInput`, `UpdateTripInput` → `UpdateEventInput`, `TrackingMode` stays
- Planner features (meals/activities/shopping) for `event_type = 'event'`: **off by default**, same toggles available as trips
- User-facing language changes: "Trip" / "Event" driven by `event_type` field in card labels

#### Migration (019_event_type.sql)
```sql
ALTER TABLE trips ADD COLUMN event_type TEXT NOT NULL DEFAULT 'trip'
  CHECK (event_type IN ('trip', 'event'));
```

#### TypeScript rename scope
All files that import `Trip`, `CreateTripInput`, `UpdateTripInput` from `@/types/trip`:
- `src/types/trip.ts` — rename types, add `event_type` field
- `src/contexts/TripContext.tsx` — rename types, rename functions (`createTrip`→`createEvent` etc.) — **or keep function names** to minimise blast radius
- `src/components/TripForm.tsx` → `EventForm.tsx` — add event_type toggle, simplify date UI for events
- `src/components/TripCard.tsx` → `EventCard.tsx` — show type badge ("Trip" / "Event")
- `src/pages/TripsPage.tsx` — update to `EventsPage.tsx` or keep filename, update labels
- `src/pages/ManageTripPage.tsx` — update labels, header
- `src/pages/QuickHomeScreen.tsx` — update labels
- `src/pages/QuickGroupDetailPage.tsx` — update labels
- `src/contexts/` (all) — update imports
- `src/hooks/` — update imports
- `src/services/` — update imports
- `src/test/factories.ts` — update test data builders

#### UI changes
1. **Create form**: two-step choice first: "Trip (multi-day)" vs "Event (one occasion)"
   - Trip: shows date range, all feature toggles
   - Event: shows single date only, planner features hidden by default (toggle available)
2. **Cards**: show badge — `Trip` (blue) or `Event` (purple/amber)
3. **Labels**: "Create New Trip" → "Create New" with type selector; "My Trips" → "My Events & Trips"
4. **Planner page**: for events, still navigable if enabled; header shows single date not range
5. **Layout nav**: "Manage Trip" label dynamically → "Manage Trip" / "Manage Event"

#### Function renaming strategy
To reduce blast radius, **rename types** (`Trip`→`Event`) but **keep context function names** (`createTrip`, `updateTrip`, `deleteTrip`) unchanged for this PR. Rename functions in a follow-up if desired.

#### File rename strategy
Rename `.tsx` files only if they are primarily trip/event-specific forms:
- `TripForm.tsx` → `EventForm.tsx` (new primary form)
- `TripCard.tsx` → `EventCard.tsx`
- Keep `TripsPage.tsx` filename, change internal labels
- Keep `ManageTripPage.tsx` filename, change internal labels

### Phase 3 — AI Receipt Reader ✅ Done (PRs #149–#154, image storage added later)
**D** — Fully implemented and deployed.
- Migration 020: `receipt_tasks` table + RLS + private `receipts` bucket
- Migration 021: `created_by DEFAULT auth.uid()` — fixes RLS violation on insert
- Edge Function `process-receipt`: `claude-sonnet-4-6` vision → structured JSON extraction (haiku ID unreliable)
- `ReceiptContext`, `ReceiptCaptureSheet`, `ReceiptReviewSheet`, `ReceiptDetailsSheet`
- Chip-tap participant assignment, confirmed total + tip, IndividualsDistribution
- Currency mismatch handling: unknown receipt currency → inline rate input → saved to trip exchange_rates
- Pending receipts banner on ExpensesPage **and** QuickGroupDetailPage
- `ReceiptCaptureSheet` extracts error body from `fnError.context.json()` for Supabase 4xx/5xx
- Model: `claude-sonnet-4-6`
- **Image storage**: receipt images ARE stored in `receipts` bucket as `{task_id}.jpg`. Upload runs in parallel with edge function (`Promise.allSettled`) — upload failure is logged as a warning but never blocks the AI flow (graceful degradation). On success, `receipt_image_path` written to the task row. Signed URL (1-hour expiry) generated client-side when review/detail sheets open. Collapsible thumbnail ("Receipt photo") shown in `ReceiptReviewSheet` and `ReceiptDetailsSheet`.

### Phase 4 — Email & Invitations ✅ Done (PRs #198–#200)
**C.** — Resend integration via `send-email` edge function. Invitation + payment reminder templates.
- PR #198: Migration 022 (participants.email + invitations + email_log), send-email edge function, IndividualsSetup + FamiliesSetup email fields, invitation trigger
- PR #199: /join/:token route + JoinPage (welcome card, account linking via Google sign-in)
- PR #200: Payment reminder button in SettlementPlan (Remind button → inline confirm → Resend API)

**Deployed ✅** — `RESEND_API_KEY` secret set, `send-email` edge function deployed, migration 022 pushed to production (2026-02-21).

### Phase 6 — Quick-mode event creation + participant setup ✅ Done (PR #218)
Keeps users in Quick mode throughout the entire onboarding flow.

- **`QuickCreateSheet`** (`src/components/quick/QuickCreateSheet.tsx`): bottom sheet (h-92vh) wrapping `EventForm`. "Create New" buttons in `QuickHomeScreen` (empty state card + bottom button) now open this sheet instead of navigating to `/create-trip`. On success: `createTrip()` → navigate to `/t/{code}/quick`.
- **`QuickParticipantSetupSheet`** (`src/components/quick/QuickParticipantSetupSheet.tsx`): bottom sheet wrapping `IndividualsSetup` or `FamiliesSetup` (chosen by `currentTrip.tracking_mode`), with a "Done" button.
- **Nudge card** in `QuickGroupDetailPage`: amber card shown when `participants.length <= 1` (just the auto-linked creator or empty). Tapping "Add" opens `QuickParticipantSetupSheet`. Card disappears once group is populated.
- Full-mode flow via `TripsPage` is **unchanged** — still redirects to `/t/{code}/manage`.

### Phase 5 — Receipt reminder emails ✅ Done (PRs #213, #214)
Extends payment reminder emails with receipt data. PR #213 attached JPEG images; PR #214 replaced attachments with inline line-item tables (better UX, smaller payload).
- `SettlementsPage.handleRemind()` collects structured receipt data (`merchant`, `items`, `confirmed_total`, `tip_amount`, `currency`) from `receiptByExpenseId` for expenses paid by the creditor (up to 3); handles individuals + families mode
- `send-email` edge function: `ReceiptEmailData` type; `receiptTableHtml()` renders a bordered HTML table per receipt (item / qty / price rows, tip row if > 0, bold total row); `formatPrice()` handles null/unknown currencies gracefully
- Receipt section injected between amount box and CTA button; italic note "Full receipt photo available in the Spl1t app." follows last table
- No-receipt path unchanged — email sends without any receipt section
- **Deployed ✅** 2026-02-22 (PR #214)

---

## 7. Session Log

| Date | Session | Work Done |
|------|---------|-----------|
| 2026-02-21 | Planning | Full codebase analysis; created PLAN.md |
| 2026-02-21 | Phase 1 | Rebrand to Spl1t — wordmarks + localStorage key migration (PR #140) |
| 2026-02-21 | Phase 2 | Events model — DB migration, Trip→Event TypeScript rename (backward-compat aliases), EventForm (type selector + single date), EventCard (type badge), dynamic "Manage Trip/Event" nav label, label updates throughout (PR #141) |
| 2026-02-21 | Phase 3 | AI Receipt Reader — migration 020, process-receipt edge function (Claude Haiku vision), ReceiptContext, ReceiptCaptureSheet, ReceiptReviewSheet (chip-tap), pending banner on ExpensesPage (PR #149) |
| 2026-02-21 | Phase 3 fixes | PLAN.md + MEMORY.md updated to reflect Phase 3 completion (PR #150); currency mismatch fix — ReceiptReviewSheet detects unknown receipt currency, prompts for exchange rate, saves to trip on submit (PR #151); scanning broken + quick mode missing scan — switched model to claude-sonnet-4-6, fixed fnError.context.json() extraction, added receipt scanning to QuickGroupDetailPage (PR #153); RLS violation fix — migration 021 adds DEFAULT auth.uid() to created_by, ReceiptContext explicitly sets created_by: user.id (PR #154) |
| 2026-02-21 | Phase 3 image storage | Receipt images now stored in `receipts` bucket — ReceiptCaptureSheet runs upload + edge fn in parallel (Promise.allSettled); collapsible thumbnail in ReceiptReviewSheet + ReceiptDetailsSheet via signed URL |
| 2026-02-21 | Error surfacing | Surface real Supabase errors across all submit flows (PR #170) — contexts throw instead of returning null/false; forms display err.message + stack trace; BankDetailsDialog shows real error in toast |
| 2026-02-21 | Phase 4 | Email & Invitations — send-email edge function (Resend), participant email fields, invitation flow, /join/:token page, payment reminder button (PRs #198–#200) |
| 2026-02-21 | Phase 4 deploy | RESEND_API_KEY set, send-email deployed, migration 022 pushed to production |
| 2026-02-22 | Phase 5 | Receipt reminder emails — attach receipt images to payment reminders (PR #213); send-email deployed |
| 2026-02-22 | Phase 5 refine | Replace receipt JPEG attachments with inline HTML line-item tables (PR #214) — structured data from client, receiptTableHtml() in edge function, no more storage downloads at send time; deployed |
| 2026-02-22 | Phase 6 | Quick-mode event creation + participant setup via bottom sheets (PR #218) — QuickCreateSheet wraps EventForm, QuickParticipantSetupSheet wraps IndividualsSetup/FamiliesSetup; nudge card on detail page when ≤1 participant |
| 2026-02-22 | Bug fixes | #215 (PR #221): JoinPage calls refreshTrips() before navigate() so stale-list redirect after invite accept is fixed; #216 (PR #222): UserCheck icon in IndividualsSetup + FamiliesSetup for participants with user_id set; #217 (PR #223): receipt email highlights debtor's items — mapped_items + debtor_participant_ids passed from SettlementsPage, receiptTableHtml() applies faf5ff/8b5cf6 row highlight; send-email redeployed; #220 (PR #224): QuickCreateSheet + QuickParticipantSetupSheet — applied useKeyboardHeight fix |
| 2026-02-22 | iOS sheet fixes | PR #227: QuickCreateSheet + QuickParticipantSetupSheet — two root causes fixed: (1) `vh`→`dvh` so sheet top no longer hides behind iOS browser chrome on initial open; (2) restructured to `flex flex-col` with `shrink-0` sticky header + `flex-1 overflow-y-auto` content, so title and X close button stay pinned regardless of scroll or input focus (same pattern as ReceiptReviewSheet) |
| 2026-02-22 | Group members sheet | PR #229: `QuickGroupMembersSheet` — Users chip (absolute top-right on relative hero wrapper) opens bottom sheet listing all participants/families with balances, "You" badge, UserCheck for linked accounts, colour-coded amount + status text. Read-only sheet: no keyboard hook needed, fixed `75dvh`. `myParticipantId = myBalance?.id`. |
| 2026-02-22 | Scan-first onboarding | PR #231: Scan button as primary entry on QuickHomeScreen. 0 groups → QuickScanCreateFlow. 1 group → navigate + openScan state. 2+ groups → QuickScanContextSheet. QuickParticipantPicker: recent people, Contacts API, manual form. Migration 024: extracted_date on receipt_tasks. |
| 2026-02-22 | Abort stale requests | PR #234: `useAbortController` hook — cancels previous in-flight request on re-fetch. Applied to all 10 contexts + 3 page-level components. Added missing `withTimeout` to 20+ mutations. |
| 2026-02-22 | E2E smoke tests | Playwright setup — 26 tests (13 routes × 2 viewports: mobile 375×812 + desktop 1280×720). Supabase fully mocked via `page.route()` interceptor + localStorage seeding. `npm run test:e2e` / `test:e2e:ui`. (PR #238) |
| 2026-02-22 | Unit test fixes | Fix 9 pre-existing test failures from PR #234's `.abortSignal()` additions: updated mock chains in 5 context test files; fixed real bug in `ShoppingContext.tsx` (missing `setLoading(false)` in no-trip branch); added `functions.invoke` mock to `AuthContext.test.tsx`. 139/139 tests pass. (PR #243) |
| 2026-02-22 | Bug fixes + global scan | #241: ReceiptReviewSheet unselected pills unified to neutral grey, alternating item row bg; #242: QuickHomeScreen always shows group picker for 1+ groups (removed single-group auto-navigate shortcut); #244: QuickScanCreateFlow handleClose no longer navigates — cancel stays on current page, only Done navigates; global ScanLine icon button added to Layout (always) and QuickLayout (trip pages only) — opens QuickScanContextSheet or QuickScanCreateFlow; QuickScanCreateFlow rendered inside ReceiptProvider tree in both layouts. (PR #247) |
| 2026-02-22 | Session health | Detect expired OAuth sessions and show recovery overlay. `sessionHealthBus` (pub/sub) emits `auth-error`/`api-success` from custom fetch in `supabase.ts`. `useSessionHealth` hook combines token expiry checks, `visibilitychange`/`online` listeners, periodic polling, and bus events. `StaleSessionOverlay` prompts page refresh (children remain mounted to preserve form data). `SessionHealthGate` wraps app inside `AuthProvider`. Also added try/catch + destructive toasts to `QuickExpenseSheet` and `QuickSettlementSheet`. (PR #249) |
| 2026-02-22 | iOS contacts autofill | Added `autoComplete="section-participant name"` and `autoComplete="section-participant email"` to QuickParticipantPicker manual form. Shared `section-participant` prefix groups fields as a logical contact unit. Note: these attributes only autofill from the user's own "My Card" (Settings > Safari > AutoFill > My Info) — not from the full address book. (PR #253) |
| 2026-02-22 | iOS contacts investigation | Investigated whether address book access is achievable on iOS Safari. **Verdict: not reliably possible.** Contact Picker API (`navigator.contacts`) is Android Chrome only; on iOS it is behind an experimental flag (off by default for regular users). Our existing `supportsContacts` check already handles this correctly. No code change made. |
| 2026-02-22 | Marketing page | Self-contained `public/marketing.html` landing page. 9 sections: sticky nav (IntersectionObserver), hero (radial blob + wavy SVG underline + staggered entrance), promise band (coral bg, 3-step flow), two modes (trip + event gradient header cards), how it works (tab switcher + pure CSS phone mockups), feature grid (2x3, 6 cards), receipt scanner spotlight (animated scan line + phone mockup), who is it for (3 persona cards), footer. All design tokens from `src/index.css` + `tailwind.config.js`. Animations respect `prefers-reduced-motion`. Responsive at 375/768/1024+ px. |
| 2026-02-23 | iOS user issue triage | 12 open issues triaged + fixed across 5 PRs + 1 issue closed as won't-fix. PR #268: withTimeout on useMyTripBalances (fix #265), dedup guard (fix #264), migration 025 enable_activities DEFAULT false (fix #266). PR #269: 'Remind' button in QuickSettlementSheet with inline confirm + receipt data (fix #256/#260), 'Manage group' action in QuickGroupDetailPage (fix #267). PR #270: X close button in QuickScanCreateFlow all steps (fix #258), line-clamp-2 for event name in QuickLayout (fix #259), 'Settle up'/'Settle' label rename (fix #261), alternating rows in TopExpensesList (fix #262). PR #271: email restyle with coral tokens (fix #257a), coral debtor highlight (fix #257b), settlements-page CTA (fix #257c), feedback timeout 20s→45s (fix #257d). PR #272: silent token refresh in useSessionHealth before showing StaleSessionOverlay. Issue #263 closed as won't-fix (Contact Picker API iOS limitation). |
| 2026-02-23 | Quick mode UX follow-up | 3 follow-up issues from iOS users triaged + fixed. PR #278: removed 'Manage group' QuickActionButton (fix #277), added gear (Settings) icon to QuickLayout header (isInTrip only) navigating to /manage with fromQuick state, ManageTripPage shows '← Back to Quick View' link when fromQuick state set (fix #277); increased gradient overlay from black/30→black/50 + inline textShadow on h1 for reliable name contrast on all gradients/browsers (fix #275); renamed settlement form-view back button 'Back'→'Settlement plan' for context (fix #274). |
| 2026-02-23 | Header declutter + back button | PR #280: QuickLayout switched to two-row header when isInTrip && !isSubPage — Row 1 gives trip name full horizontal width (only avatar on right), Row 2 is a compact action strip (Bug, Scan, Gear, ModeToggle, size=18 p-1.5). Sub-pages and home screen keep single-row. Main padding pt-[96px] for two-row, pt-16 otherwise. ManageTripPage 'Back to Quick View' replaced with coral-outlined Button (border-primary text-primary hover:bg-primary). |
| 2026-02-23 | Auth deadlock fix | **Root cause**: `onAuthStateChange` callback in `AuthContext.tsx` `await`ed Supabase DB queries (`fetchProfile`/`upsertProfile`) while the Supabase auth lock was held. Every PostgREST request calls `getSession()` which re-acquires the same lock → circular deadlock. Triggered after any token refresh (manual or auto). **Fix**: made `onAuthStateChange` callback synchronous — profile upsert deferred to `setTimeout(0)`, `TOKEN_REFRESHED` profile fetch removed (user data unchanged). Added `debugLogger.ts` (`localStorage.setItem('spl1t_debug','true')`) for production diagnostics. Auth safety rule added to CLAUDE.md. Full analysis in `DIAGNOSIS.md`. Files: `src/contexts/AuthContext.tsx`, `src/hooks/useSessionHealth.ts`, `src/lib/debugLogger.ts`, `DIAGNOSIS.md`, `CLAUDE.md`. |
| 2026-02-23 | Quick header grid strip | PR #285 (issue #282): replaced right-aligned bare icon row in QuickLayout two-row header with a structured `grid-cols-3` ghost-pill action bar — **Scan / Manage / Full view** — each with 14px icon + 11px label. Removed `ReportIssueButton` from header entirely. `Full view` pill calls `setMode('full')` + navigates to expenses. Hairline `border-t` divider between rows; `bg-white/10` pills on gradients, `bg-muted` on plain bg. Main padding `pt-[96px]` → `pt-[108px]`. Home screen (`!isInTrip`) row 1: `ModeToggle` + avatar only. |
| 2026-02-23 | Auth-error hardening | PR #288: (1) 403 no longer emits `auth-error` — only 401 triggers session health check; (2) `auth-error` bus handler checks `isTokenExpired()` before attempting refresh — valid-token 401s (RLS, race conditions) are logged and skipped; (3) 30s cooldown between refresh attempts via `lastRefreshAttemptRef`; (4) `updateBankDetails` timeout 35s→10s for consistency. |
| 2026-02-23 | Full mode header redesign + bug button | PR #290: (1) QuickLayout — restored `ReportIssueButton` to row 1 right side when `isInTrip` (accidentally removed in PR #285); (2) Layout — two-row header on mobile when in trip: row 1 keeps name + bug button + avatar, row 2 (`lg:hidden`) adds `grid-cols-3` pill strip — Scan / Manage / Quick view — matching QuickLayout's pattern; desktop in-trip unchanged (scan + mode toggle stay in row 1 via `hidden lg:flex`); main padding `mt-[108px] lg:mt-20` when in trip; gradient overlay `black/30→black/50`; trip name h1 uses inline `textShadow` instead of `drop-shadow-md`. |

---

## 8. Auth Regression Test Checklist

Must pass before any future auth-related PR is merged:

- [ ] Fresh load → submit expense → works
- [ ] Fresh load → wait 5 min → submit expense → works
- [ ] Fresh load → submit 5 expenses in a row → all work
- [ ] Fresh load → navigate between 5 routes → submit expense → works
- [ ] Simulate stale session (expire token in DevTools) → app recovers → submit works
- [ ] Open app in two tabs simultaneously → both tabs work independently
- [ ] Enable debug logging (`localStorage.setItem('spl1t_debug','true')`) → check `window.__spl1tLogs()` after each scenario — no hung entries, subscription count stable
