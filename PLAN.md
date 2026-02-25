# PLAN.md — Spl1t Feature Planning Document

> **Living document.** Update at the start and end of every session.
> Last updated: 2026-02-25 (Phases 1–7 ✅; family refactor Phases 1–4 ✅ COMPLETE)

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
| Tests | Vitest + Testing Library (145 unit tests, all passing), Playwright (26 E2E smoke tests) |
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
| E | UX/UI Unification | ✅ Done (7a–7h all complete) | — |

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

### Phase 7 — UX/UI Unification (Planned)

**Goal**: Converge Quick and Full modes toward a single adaptive UI. Quick mode = reduced-clutter view of the same app, not a separate app. Full mode = detailed view with all features visible.

**Dynamic color system — audit and implementation prerequisite:**
Trip header colors are assigned dynamically at creation time via
`src/services/gradientService.ts` and `src/services/tripGradientService.ts`.
Before any Phase 7 header work begins, CC must read both files and verify:
- The same trip renders an identical gradient in Quick mode and Full mode headers
- Admin page trip cards use the same color system as the rest of the app
- Any mockups or examples use representative gradient samples, not a single hardcoded gradient

**Design Decisions** (from UX/UI audit session 2026-02-23):

| Decision | Choice |
|----------|--------|
| Architecture direction | Adaptive UI — converge toward one layout system |
| Quick mode desktop | Two-column layout using extra space (balance+actions left, content right) |
| Mode toggle placement | Keep in top bar (frequently used) |
| Mobile nav per mode | Keep distinct — Quick: no bottom nav, Full: bottom tab bar |
| Admin page | Wrap in Full mode Layout (standard header/nav) |
| Full home hero | Replace "Split costs with anyone" with Quick-style personal greeting |
| Trip card info | Balance + dates, code hidden (unified card component) |
| Redundant Quick buttons | Remove "See in Full Mode" + "My Groups" from Quick trip detail body |
| Scan prominence | Primary action — promoted above manual entry everywhere |
| Receipt pending banner | Extract into shared `PendingReceiptBanner` component |
| Loading/error states | Formalize as `<PageLoadingState />` and `<PageErrorState />` components |
| Mode toggle icons | `Zap` / `LayoutGrid` everywhere (ModeToggle + Row 2 pills) |

#### Phase 7a — Shared UI primitives (no visual change) ✅ Done (PR #336)
Extract reusable components that currently exist as duplicated patterns. Foundation for all subsequent phases.

**Tasks:**
1. **`PendingReceiptBanner`** — extract from `QuickGroupDetailPage` + `ExpensesPage` into `src/components/receipts/PendingReceiptBanner.tsx`. Standardize on `rounded-xl`. Props: `tasks`, `onReview`, `onDismiss`, `defaultCurrency`.
2. **`PageLoadingState`** — new `src/components/PageLoadingState.tsx`. Centered `Loader2` spinner with optional "Taking longer than expected..." after configurable timeout (default 8s). Props: `slowMessage?: string`, `slowTimeout?: number`.
3. **`PageErrorState`** — new `src/components/PageErrorState.tsx`. Red `AlertCircle` card with error message + Retry button. Props: `error: string`, `onRetry`, `retrying?: boolean`.
4. **Unified trip card component** — new `src/components/TripCard.tsx` (rename existing `EventCard.tsx`). Shows: name, balance (colored), date range (compact secondary line), Active badge. No trip code. Used by both Quick home and Full home. Props: `trip`, `balance`, `isActive`, `onClick`.

**Files touched:** `QuickGroupDetailPage.tsx`, `ExpensesPage.tsx`, `QuickHomeScreen.tsx`, `HomePage.tsx`, `SettlementsPage.tsx`, `DashboardPage.tsx`, `ManageTripPage.tsx`, `PlannerPage.tsx`, `ShoppingPage.tsx`

**Acceptance:** All existing pages use the new shared components. No visual regression. Type-check + tests pass.

#### Phase 7b — Mode toggle icon unification ✅ Done (PR #338)
Small, self-contained change.

**Tasks:**
1. Update `ModeToggle.tsx` — replace `Zap`/`Settings2` with `Zap`/`LayoutGrid` icons (matching Row 2 pills)
2. Verify Row 2 pills in both `Layout.tsx` and `QuickLayout.tsx` already use `Zap`/`LayoutGrid` — no change needed if so

**Files touched:** `src/components/quick/ModeToggle.tsx`

**Acceptance:** `Zap` = Quick, `LayoutGrid` = Full in all locations. Visual consistency confirmed.

#### Phase 7c — Remove redundant Quick mode buttons ✅ Done (PR #338)
Clean up the Quick trip detail page.

**Tasks:**
1. Remove "My Groups" outline button from bottom of `QuickGroupDetailPage` (← back arrow in header already navigates to groups)
2. Remove "See in Full Mode" outline button from bottom of `QuickGroupDetailPage` (Row 2 "Full view" pill already does this)
3. Verify the `space-y-3` container at the bottom is removed entirely (both buttons gone)

**Files touched:** `src/pages/QuickGroupDetailPage.tsx`

**Acceptance:** Quick trip detail page ends after the action buttons. No way-finding regression (header provides both paths).

#### Phase 7d — Full mode home page overhaul ✅ Done (PR #342)
Replace the marketing-style hero with Quick-style personal greeting. Unify trip cards.

**Tasks:**
1. Replace "Split costs with anyone" hero + subtitle in `HomePage.tsx` with personal greeting:
   - Authenticated: avatar + "Hi, {firstName}" + "Your events & trips"
   - Unauthenticated: generic "Events & Trips" heading
2. Replace existing trip card rendering with the unified `TripCard` component from 7a
   - Show balance per trip (requires `useMyTripBalances` — currently only in Quick mode)
   - Show date range as secondary line
   - Remove trip code display from cards
   - Keep "Create New" button
3. Keep the 2-column grid on desktop (`grid-cols-1 md:grid-cols-2`) but with the new card design

**Files touched:** `src/pages/HomePage.tsx`

**New dependency:** `useMyTripBalances` hook used in `HomePage` (currently only used in `QuickHomeScreen`)

**Acceptance:** Full home page shows balance-forward trip cards with personal greeting. Matches Quick home in information density. Type-check + tests pass.

#### Phase 7e — Admin page in Layout ✅ Done (PR #340)
Wrap the admin page in the standard Full mode Layout.

**Tasks:**
1. Move `/admin/all-trips` route inside the `Layout` route group in `routes.tsx`
2. Remove standalone `min-h-screen bg-background` wrapper from `AdminAllTripsPage.tsx` (Layout provides this)
3. Verify admin page gets standard header, side nav (desktop), bottom nav (mobile)
4. Admin page should work for unauthenticated users who land there — the `isAdminUser()` gate already handles access control

**Files touched:** `src/routes.tsx`, `src/pages/AdminAllTripsPage.tsx`

**Acceptance:** Admin page has standard header with logo. Desktop shows side nav. Mobile shows bottom nav with "More". Back navigation works.

#### Phase 7f — Scan as primary action ✅ Done (PR #346)
Establish Scan as the most prominent action across the app. Reduce visual weight of "Add an expense" to secondary.

**Tasks:**
1. **Quick trip detail**: Swap order — "Scan a receipt" becomes the first `QuickActionButton`, "Add an expense" becomes second
2. **Quick trip detail**: Give Scan button visual emphasis — e.g., `border-primary/30 bg-primary/5` to distinguish it from the other action cards
3. **Full mode Expenses page**: Add a prominent "Scan Receipt" button next to "Add Expense" (currently the scan button is icon-only in the header — easy to miss)
4. Verify Quick home "Scan a Receipt" CTA (coral bg) remains the top-level primary action — no change needed

**Files touched:** `src/pages/QuickGroupDetailPage.tsx`, `src/pages/ExpensesPage.tsx`

**Acceptance:** Scan is visually the #1 action on both Quick trip detail and Full Expenses pages.

#### Phase 7g — Unified home page + bug fixes ✅ Done (PR #351)
**Pivot**: Instead of a two-column Quick desktop layout (original plan), merged the home pages into one responsive view. The Quick/Full mode distinction only matters inside trip views now.

**What changed:**
1. Merged `QuickHomeScreen` features (scan CTA, `QuickCreateSheet`, motion animations, scan flows) into `HomePage`
2. Simplified `ConditionalHomePage` — only redirects on mobile + active trip; always renders `<HomePage />` otherwise
3. Removed `/quick` home route; added `<Navigate to="/" />` redirect for backward compat
4. Fixed "Full view" pill navigating to `/expenses` instead of `/dashboard` (#345)
5. Fixed QuickLayout back arrow pointing to `/quick` instead of `/`
6. Hidden scan + mode toggle from Layout header on home page (page has its own CTA)
7. Mode toggle only navigates when inside a trip
8. Deleted `QuickHomeScreen.tsx`
9. Updated unit + e2e tests

**Files touched:** `HomePage.tsx`, `ConditionalHomePage.tsx`, `routes.tsx`, `QuickLayout.tsx`, `Layout.tsx`, `ModeToggle.tsx`, `QuickGroupDetailPage.tsx`, `QuickHomeScreen.tsx` (deleted), `ConditionalHomePage.test.tsx`, `quick-mode.spec.ts`

**Closes:** #344, #345, #348

#### Phase 7h — Standardize loading/error states across all pages ✅ Done (PR #349)
Replace ad-hoc loading/error patterns with the shared components from 7a.

**Tasks:**
1. ~~`QuickGroupDetailPage` — already uses the pattern; refactor to `<PageLoadingState />` and `<PageErrorState />`~~ (already done in 7a)
2. ✅ `ExpensesPage` — replace "Loading expenses..." text with `<PageLoadingState />`; replace red banner with `<PageErrorState />`
3. ✅ `SettlementsPage` — add loading state (currently has none); add error state
4. ✅ `DashboardPage` — add loading/error states
5. ✅ `PlannerPage` — add loading/error states
6. ✅ `ShoppingPage` — add loading/error states (Shopping has its own error toast; add card-level error too)
7. ✅ `ManageTripPage` — add loading/error states
8. ✅ `QuickHistoryPage` — verify loading state exists; add error state if missing
9. ✅ `QuickHomeScreen` — already has spinner; standardize to `<PageLoadingState />`
10. ✅ `AdminAllTripsPage` — add loading state (currently shows 0 trips briefly before data loads)

**Files touched:** All page-level components listed above

**Acceptance:** Every page uses `<PageLoadingState />` for loading and `<PageErrorState />` for errors. Consistent spinner + retry pattern app-wide. Visual regression check.

#### Implementation Order & Dependencies

```
7a (primitives)  ──→  7d (Full home overhaul)
                 ──→  7f (Scan primary)
                 ──→  7h (loading/error everywhere)

7b (icons)       ──→  (standalone, no deps)
7c (remove btns) ──→  (standalone, no deps)
7e (admin)       ──→  (standalone, no deps)
7g (desktop 2col)──→  depends on 7a (shared components), 7c (buttons removed), 7f (scan order)
```

**Recommended PR sequence:**
1. ✅ PR: Phase 7a — shared UI primitives (PR #336)
2. ✅ PR: Phase 7b + 7c — icon unification + remove redundant buttons (PR #338)
3. ✅ PR: Phase 7e — admin page in Layout (PR #340)
4. ✅ PR: Phase 7d — Full home overhaul (PR #342)
5. ✅ PR: Phase 7f — Scan as primary action (PR #346)
6. ✅ PR: Phase 7h — standardize loading/error states (PR #349)
7. ✅ PR: Phase 7g — Unified home page + bug fixes (PR #351)

**Risk notes:**
- Phase 7d (Full home overhaul) changes the main landing page — high visibility, test thoroughly
- Phase 7g (two-column) is the most complex layout change — prototype on a branch before committing
- `useMyTripBalances` currently fires N+1 queries (one per trip) — may need optimization before using on Full home with many trips

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
| 2026-02-23 | Timeout audit | Audited all `withTimeout`, `setTimeout`, and `setInterval` calls across the codebase. Found 40 `withTimeout(35000)` calls wrapping regular PostgREST mutations — all dead code because the fetch-level AbortController fires at 30s first. Changed all 40 to 15000. Added unmount guard (`isMounted`) to two `setTimeout` calls in `useSessionHealth.ts`. Updated CLAUDE.md with standardised timeout values. |
| 2026-02-23 | iOS UX batch #2 | 4 open issues resolved across 3 PRs. **PR #295** (issues #294, #283): removed duplicate trip name subtitle from DashboardPage (Layout header already shows it); moved members count chip from `absolute top-right` overlay to centered below-balance document flow with "N members" label. **PR #296** (issue #289): quick mode sub-pages now show `✕` instead of `←` — consistent with sheet dismiss pattern across all quick mode screens. **PR #297** (issue #293): Expenses page decluttered — Export Excel + Scan Receipt reduced to icon-only ghost buttons; search/category filters hidden behind collapsible `SlidersHorizontal` toggle with active-filter badge dot indicator. |
| 2026-02-23 | Data integrity audit fixes | 7 fixes from AUDIT.md (findings 7, 8, 9, 11, 14, 17, 22, 23, 27, 33). (1) `withTimeout` now accepts optional `AbortController` and aborts on timeout — wired to all mutations across 6 contexts (Expense, Trip, Participant, Settlement, Shopping, Receipt). (2) Client-side UUID via `crypto.randomUUID()` for `createExpense` and `createSettlement` — retry hits PK conflict instead of duplicate. (3) Ref-based submit guards (`isSubmittingRef`) on ExpenseWizard, ExpenseForm, QuickSettlementSheet, QuickScanCreateFlow. (4) Shopping `deleteShoppingItem` simplified to single DELETE (ON DELETE CASCADE handles meal links). (5) `UserPreferencesContext` resets `hasInitialized` on user identity change. (6) `ManageTripPage` uses `removeFromMyTrips()` instead of wrong `'myTrips'` key. (7) Orphaned receipt tasks: client marks task `'failed'` when edge fn fails; `ReceiptContext` fetches failed tasks. 139/139 tests pass, type-check clean. |
| 2026-02-23 | Reliability audit fixes | 8 findings from AUDIT.md (1, 10, 12, 13, 15, 18, 26, 31). (1) `ErrorBoundary` wired in `App.tsx` (wraps provider tree) + per-route boundaries in `routes.tsx`; reset loop fix: after 2 retries shows "Go home" / "Refresh page" + collapsible error details. (2) Error surfacing: Shopping/Meal/Activity/Stay contexts now expose `error`/`clearError`; toast effects in `ShoppingPage` and `PlannerPage`. (3) `UserPreferencesContext` loading check changed from old key to `spl1t:user-preferences`. (4) 5 contexts (Expense, Participant, Meal, Activity, Stay) now clear state in `else` branch when no trip active. (5) `useMyTripBalances`: `cancelled` flag + `AbortController` with cleanup; signals passed to all queries. (6) `TripContext`: `setTrips([])` before `fetchTrips()` on user identity change. (7) Zustand store deleted, `zustand` removed from dependencies. 139/139 tests pass, type-check clean, no zustand in bundle. |
| 2026-02-23 | Security audit fixes | 10 findings from AUDIT.md (2, 3, 4, 5, 6, 16, 20, 41, 42, 43). (1) Admin auth: replaced password-based system with Supabase user ID allowlist (`isAdminUser`); removed `authenticateAdmin`, `isAdminAuthenticated`, `logoutAdmin`, `getAdminPasswordHint`, all sessionStorage usage; AdminAllTripsPage uses `useAuth()` + `isAdminUser()`. (2) Trips RLS: migration 026 — per-operation policies; INSERT auth-only, UPDATE/DELETE creator-only; SELECT open for shared link flow (documented tradeoff). (3) JWT verification: shared `_shared/auth.ts` helper; all 4 edge functions verify Bearer token via `supabase.auth.getUser()`. (4) CORS: restricted from `*` to `https://split.xtian.me` on all 4 edge functions. (5) HTML escaping: `escapeHtml()` in send-email for all user-supplied strings. (6) Image size limits: 5MB client-side (QuickScanCreateFlow + ReceiptCaptureSheet), 10MB server-side (process-receipt returns 413). (7) Receipt ownership: process-receipt verifies `task.created_by === user.id`. (8) Idempotency: process-receipt only processes tasks in 'pending' status; conditional update `.eq('status', 'pending')`. |
| 2026-02-23 | Audit cleanup | 14 remaining low-severity findings from AUDIT.md resolved. (1) localStorage caps: myTrips MAX_ENTRIES=100, mutedTrips MAX_MUTED=200, trim on insert. (2) Unmount guards: AuthContext cancelled flag + clearTimeout on profileTimerId; UserPreferencesContext cancelled flag. (3) ReceiptContext error surfacing: clearError + setError in all mutation catch blocks; toast in ReceiptReviewSheet. (4) ParticipantContext clearError exposed; toast in ManageTripPage. (5) ReceiptTaskUpdate type replaces `as any` cast. (6) ShoppingContext stale channel dead code removed. (7) Schema versioning (SCHEMA_VERSION=1) on myTripsStorage, mutedTripsStorage, userPreferencesStorage. (8) OnboardingPrompts keys renamed to spl1t: prefix. (9) Debug logger debounced (500ms flush + beforeunload sync). (10) withTimeout on all Shopping/Meal helper queries + link/unlink mutations. (11) Global toast for unhandled promise rejections via custom event. All 44 audit findings now resolved. 139/139 tests pass, type-check clean. |
| 2026-02-23 | Production smoke test | Interactive Playwright MCP smoke test against https://split.xtian.me. 6/8 scenarios PASS, 2 SKIPPED (require OAuth). Verified: unauthenticated shared link access (RLS fix PR #310), double-tap submit guard (PR #307), ErrorBoundary (PR #308), admin access control (PR #309), trip state clearing (PR #308). Console baseline clean — only pre-existing Radix DialogTitle warnings and expected log-proxy 401s. **Bug found**: authenticated users cannot load shared trips they didn't create — `TripContext.fetchTrips()` applies client-side `created_by` filter that excludes shared-link trips. Database RLS is correct (`SELECT USING (true)`); issue is React-side only. Results in `SMOKE_TEST_RESULTS.md`. |
| 2026-02-23 | UX/UI audit | Full UX/UI audit of the entire app — top bar inventory, navigation consistency, typography, color, components, mobile/desktop experience, empty/loading states, iconography, micro-interactions. 14 top findings documented. Playwright MCP screenshots (19 screens across both modes, desktop + mobile). Phase 3 design decisions captured via sequential questions. **Phase 7: UX/UI Unification** planned — 8 sub-phases (7a–7h), 7 PRs. Key decisions: adaptive UI direction, Scan as primary action, unified trip cards with balance+dates, shared loading/error components, admin page in Layout, Quick-style greeting on Full home, two-column Quick desktop layout. |
| 2026-02-23 | Phase 7a | Shared UI primitives (PR #336). 4 new components: `PendingReceiptBanner` (extracted from QuickGroupDetailPage + ExpensesPage), `PageLoadingState` (spinner + slow message), `PageErrorState` (error card + retry), `TripCard` (unified card with balance + actions slot). Wired into QuickGroupDetailPage, ExpensesPage, QuickHomeScreen. Deleted dead `EventCard.tsx` + old `TripCard.tsx`. Net -196 lines. |
| 2026-02-24 | Phase 7d | Full mode home page overhaul (PR #342). Replaced "Split costs with anyone" hero with Quick-style personal greeting (avatar + "Hi, {firstName}" for auth, "Events & Trips" for anon). `HomePage` now uses `useMyTripBalances` + unified `TripCard` with balance, dates, active badge, and `GroupActions` (hide/leave). Added hidden trips section. `TripCard` gained date range secondary line (both modes). Removed trip code from cards. `PageLoadingState` for auth loading. Anonymous view keeps localStorage cards with share/remove. |
| 2026-02-24 | Phase 7f | Scan as primary action (PR #346). Swapped "Scan a receipt" to position 1 in Quick trip detail with `emphasis` prop (`border-primary/30 bg-primary/5`). Added `ScanLine` icon-only ghost button to Expenses page header action bar. Quick home coral CTA unchanged. |
| 2026-02-24 | Phase 7h | Standardize loading/error states (PR #349). Replaced ad-hoc loading text and error toasts/banners with `<PageLoadingState />` and `<PageErrorState />` on 9 pages: ExpensesPage, SettlementsPage, DashboardPage, PlannerPage, ShoppingPage, ManageTripPage, QuickHistoryPage, QuickHomeScreen, AdminAllTripsPage. Every page now has a consistent centered spinner + retry-on-error pattern. Removed toast-based error surfacing from Planner/Shopping/Manage pages. |
| 2026-02-24 | Phase 7g | Unified home page + bug fixes (PR #351). Pivoted from two-column Quick desktop layout to merging home pages — QuickHomeScreen features (scan CTA, QuickCreateSheet, motion animations, scan flows) merged into HomePage. ConditionalHomePage simplified to mobile-only active-trip redirect. `/quick` route removed (redirect added). Fixed "Full view" pill → `/dashboard` (#345), back arrow → `/`, header scan/toggle hidden on home. Deleted QuickHomeScreen.tsx. Closes #344, #345, #348. **Phase 7 complete.** |
| 2026-02-24 | Issue triage | 3 user-reported issues triaged. #355 (back button broken) already fixed by PR #351 — closed. #356 (inconsistent desktop headers) + #352 (edit dialog mobile alignment) fixed in PR #357: QuickLayout desktop header unified with Layout (Row 2 `lg:hidden`, scan+toggle in Row 1 `hidden lg:flex`, header widened to `max-w-lg lg:max-w-7xl`); ManageTripPage edit dialog `max-w-2xl` → `max-w-lg mx-4 sm:mx-auto`. |
| 2026-02-24 | Issue triage #2 | 4 issues triaged (#358–#361). **PR #363** (closes #361, #360): mobile redirect loop fix — back arrow on `/t/:code/quick` passed `state.fromTrip` to `/`; `ConditionalHomePage` skips auto-redirect when `fromTrip` present; trip name in Layout header wrapped in `<Link to="/" state={{ fromTrip: true }}>` for single-tap home access in full mode; overflow menu "Events & Trips" also passes state; new test added. **PR #364** (closes #359): `QuickSettlementSheet` standardized to iOS sheet pattern — `h-[85vh] overflow-y-auto` replaced with `flex flex-col` + sticky header (`shrink-0` + `border-b`) + `flex-1 overflow-y-auto` content + `useKeyboardHeight` for iOS keyboard handling. **#358** closed with comment (positive feedback, not a bug). **#360** closed as duplicate of #361. |
| 2026-02-24 | Sheet/dialog audit | Full audit of all 11 bottom sheets + 20+ desktop dialogs. Defined single structural standard: `hideClose` + 3-slot header (back/spacer | title | close) + `flex flex-col` + `shrink-0` header + `flex-1 overflow-y-auto overscroll-contain` content + `dvh` heights. Created `AppSheet` reusable component (`src/components/ui/AppSheet.tsx`). Fixed all 11 sheets: 6 minor (close btn + hideClose + overscroll-contain), 3 moderate (header refactor), 2 full rebuilds (ReceiptCaptureSheet, DayDetailSheet). Added 3 sheet pitfalls to CLAUDE.md + new "Bottom Sheet Standard" section. Verified 5 sheets via Playwright MCP (localhost, 375×812). 140/140 tests pass, type-check clean. Full audit log in `SHEET_AUDIT.md`. |
| 2026-02-24 | Logo + favicon refresh | Replaced old Trip-Splitter Pro circular clipart logo with new Spl1t split-S letter mark (coral + cream). Generated favicon at 32px + 16px (coral background for legibility) and apple-touch-icon at 180px. Updated index.html favicon tags, Layout.tsx + QuickLayout.tsx already had correct alt text. Updated marketing.html nav to show logo mark (32px) + wordmark side by side. Source assets archived in public/brand/. |
| 2026-02-24 | Expense wizard numpad fix | PR #376: iOS Safari numpad keyboard (`inputMode="decimal"`) is taller than text keyboard — causes `visualViewport.offsetTop > 0`, pushing sheet header (✕ close button) above visible viewport on first open. Fix: added `viewportOffset` (`visualViewport.offsetTop`) to `useKeyboardHeight` hook; subtracted from sheet height in MobileWizard. When offset=0 (common case), behavior unchanged. Same vulnerability exists in 6 other sheets — logged in SHEET_AUDIT.md §8.1 for follow-up. |
| 2026-02-24 | Quick actions consistency audit | Unified all 4 quick action buttons in QuickGroupDetailPage: mobile → bottom sheet, desktop → centered Dialog. (1) `dialog.tsx`: added `hideClose` prop to `DialogContent`. (2) `ReceiptCaptureSheet`: added Sheet/Dialog conditional (was always bottom sheet). (3) `QuickSettlementSheet`: added `viewportOffset` fix to keyboard style + Sheet/Dialog conditional. (4) Created `QuickHistorySheet` (was page navigation to `/quick/history`, now overlay). (5) `QuickGroupDetailPage`: history button switched from `navigate()` to `setHistoryOpen(true)`. Verified all 4 buttons via Playwright MCP on mobile (375×812) + desktop (1280×800). 140/140 tests, type-check clean. Full audit log in `QUICK_ACTIONS_AUDIT.md`. |
| 2026-02-24 | Family refactor Phases 1–3 | **Phase 1** (PR #386): migration 029 `wallet_group TEXT` on participants, backfill from families table. **Phase 2** (PR #387): V2 balance calculator with `buildEntityMap`, 152/152 tests, zero snapshot discrepancies. **Phase 3** (PR #388): removed families entity model — deleted `FamiliesSetup.tsx`, `FamiliesDistribution`/`MixedDistribution` types, simplified 40 files, -3013 net lines, 137/137 tests. Migrations 029–032 (wallet_group → account_for_family_size → drop family_id → drop families table). See `FAMILY_REFACTOR.md` for full details. |
| 2026-02-25 | Phase 3 regression fix | PR #392: Fixed 2 regressions from family refactor Phase 3. **Bug 1 (CRITICAL)**: Radix `Checkbox` in wallet_group group headers caused infinite re-render crash ("Maximum update depth exceeded") on trips with wallet_groups — replaced with plain `<span>` visual elements in `ExpenseForm.tsx` + `WizardStep3.tsx`. **Bug 2 (HIGH)**: SettlementsPage `fromEmailMap`, `bankDetailsMap`, `handleRemind` keyed by `p.id` instead of entity IDs from `buildEntityMap` — bank details/emails undefined for wallet_group trips. Fixed to match `QuickSettlementSheet.tsx` pattern. 137/137 tests, type-check clean. Documented in `PHASE_3_BUGS.md`. |
| 2026-02-25 | Family refactor Phase 4 | PR #395: Within-group balance view — the feature that motivated the entire refactor. New `calculateWithinGroupBalances()` function in `balanceCalculator.ts` (only tracks expenses paid by group members; credits payer with group share only, so balances net to zero). Toggle "Within-group balances" in `QuickGroupDetailPage.tsx` — per-group Card with member balances, "Evenly split" indicator, "No shared expenses yet" empty state. 6 new tests. 143/143 tests, type-check clean. **Family entity refactor COMPLETE (all 4 phases).** |
| 2026-02-25 | Family refactor cleanup | PR #396: 7-issue post-refactor cleanup. (1) Removed tracking_mode selector from TripForm, EventForm, ManageTripPage, AdminAllTripsPage — hardcoded `'individuals'`. (2) Added wallet_group hint text in ParticipantsSetup. (3–4) Verified wallet_group is changeable mid-trip and datalist autocomplete works (no code needed). (5) Moved `accountForFamilySize` from trip-level toggle to per-expense field on `IndividualsDistribution` — toggle shown in ExpenseForm/WizardStep3 only when wallet_group participants selected; removed from ManageTripPage. (6) `calculateWithinGroupBalances` now folds children's balances into adults (2 new tests). (7) Within-group balances moved from QuickGroupDetailPage to SettlementsPage (Full mode). 145/145 tests, type-check clean. |

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
