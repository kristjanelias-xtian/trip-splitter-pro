# Enhancements / Issues / Bugs — Phased Plan

## Context

15 user-reported issues (GitHub, 2026-02-20/21) need to be addressed. This document tracks them separately from `PLAN.md` (which covers feature phases like Email & Invitations).

---

## Phase 1 — Critical Mobile Bugs ✅

**Goal:** Fix issues that completely block users from doing core tasks on mobile.

| # | Title | Root Cause | Fix |
|---|---|---|---|
| #179 | Chrome iOS can't toggle to full mode | `ConditionalHomePage`: `shouldGoQuick = mode === 'quick' \|\| isMobile` — always redirects mobile back to quick, even after user explicitly clicked "Full" | Changed to `mode === 'quick' \|\| (isMobile && mode !== 'full')` |
| #178 | Fresh browser doesn't see groups | `QuickHomeScreen` has no distinct loading state — when auth finishes but trips are still fetching, the empty-state ("no trips") flashes immediately | Show `Loader2` spinner in `QuickHomeScreen` while `tripsLoading && user` |

**Files:** `src/pages/ConditionalHomePage.tsx`, `src/pages/QuickHomeScreen.tsx`

---

## Phase 2 — Copy, Naming & Layout Polish ✅

**Goal:** Fix visual/copy issues that erode trust or confuse users. All low-risk.

| # | Title | Root Cause | Fix |
|---|---|---|---|
| #142 | Landing page says "Family Trip" | `HomePage.tsx` h1 still says "Family Trip Cost Splitter" | Updated to "Split costs with anyone" |
| #146 | Event name lost in quick mode | QuickLayout header shows "Loading..." and never derives entity label | Show `currentTrip?.name` once loaded; derive "Trip"/"Event" label from `event_type` |
| #176 | Inconsistent naming in quick mode | `QuickGroupDetailPage` hardcodes "Trip not found" / "Go to My Trips" | Use `entityLabel` (same pattern as ManageTripPage) for entity-aware strings |
| #145 | Currency box too narrow on desktop | `ExpenseForm` has `SelectTrigger className="w-24"` vs `w-28` in mobile wizard | Changed to `w-28` |
| #148 | Sidebar shows at trips list root | `Layout.tsx` always renders sidebar + `lg:ml-64` main margin | Hide sidebar and remove margin when `tripCode` is absent |
| #174 | Expenses page stretches full-width on desktop | `ExpensesPage` content has no `max-w-*` | Wrapped content in `max-w-4xl mx-auto` |

**Files:** `src/pages/HomePage.tsx`, `src/components/QuickLayout.tsx`, `src/pages/QuickGroupDetailPage.tsx`, `src/components/expenses/ExpenseForm.tsx`, `src/components/Layout.tsx`, `src/pages/ExpensesPage.tsx`

---

## Phase 3 — Reliability ✅

**Goal:** Reduce frustration from errors that leave users stuck.

| # | Title | Root Cause | Fix |
|---|---|---|---|
| #136 | Timeout when posting expense; reload required | After 15 s timeout the error shows but no retry affordance exists | Added "Try again" button to `ExpenseForm`/`MobileWizard` error state; form is not reset on timeout failure |
| #147 | 0.02 rounding discrepancy in Dashboard | Floating-point accumulation across many expenses; individual splits rounded to 2dp but totals aren't | Round net balance values to `Math.round(v * 100) / 100` before display in `DashboardPage` |

**Files:** `src/components/expenses/ExpenseForm.tsx`, `src/components/expenses/ExpenseWizard.tsx`, `src/pages/DashboardPage.tsx`

---

## Phase 4 — Onboarding & Participant Flow ✅

**Goal:** Make it easier for new users to get started after creating an event.

| # | Title | Root Cause | Fix |
|---|---|---|---|
| #143 | Participants section at bottom of Manage page | ManageTripPage renders participants after Details, Features, Currency cards | Moved participants card to top position; added empty-state callout "Add participants to get started" |
| #144 | No email field when adding participants | `IndividualsSetup` / `CreateParticipantInput` has no `email` field | Deferred to Phase 4 (Email & Invitations) in PLAN.md — the email capture is part of the invitation flow |

**Files:** `src/pages/ManageTripPage.tsx`

---

## Phase 5 — Investigate / Deferred

Issues that need more live testing before a fix is committed.

| # | Title | Status | Notes |
|---|---|---|---|
| #162 | Receipt item chips not visually distinct | Investigate | `CHIP_COLORS` palette already implemented in `ReceiptReviewSheet` (lines 42-55). Needs live testing to confirm if contrast is actually the problem before changing anything |
| #158 | Keyboard hides expense form on iOS (full mode) | Deferred | Desktop `Dialog` doesn't apply `useKeyboardHeight` unlike `MobileWizard`. Complex fix — warrants its own spike once Phases 1–4 ship |

---

## Verification per Phase

| Phase | How to verify |
|---|---|
| 1 | On iPhone Chrome: tap "Full" in ModeToggle → stays in full mode. On fresh browser while authenticated → spinner shows instead of empty state |
| 2 | Desktop Chrome wide window: expenses page has max-width; root `/` has no sidebar; currency box wider. Quick view for an event entity shows correct label. Landing page no longer says "Family" |
| 3 | Throttle network in DevTools; submit expense → timeout error shows "Try again" button. Dashboard settlement amounts are exact round cents |
| 4 | Create new event → manage page shows participants first. Empty-state callout visible |
| 5 | (After live test) receipt item chips clearly distinguishable per participant |
