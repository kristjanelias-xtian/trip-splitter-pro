# Spl1t — User Stories & Flows

**Version 1.0 · February 2026**  
**Prepared for Claude Code**

10 User Stories · 2 Personas · 2 Event Types

---

## Overview

Spl1t is an expense-splitting app with two core use cases: multi-day group trips (families, friends travelling together) and single-occasion events (dinners, drinks, team activities). This document defines the distinct user stories for each mode and the shared flows that span both.

---

## Two Event Types

| | Trip (Multi-day) | Event (Single-day) |
|---|---|---|
| **Duration** | Multiple dates | Single date only |
| **Creation** | Pre-created by organiser | Can be triggered via receipt scan |
| **Planning** | Meal & activity planning included | Expenses only |
| **Access** | Shared link | Shared link + email invite |
| **UI Modes** | Full & Quick mode | Full & Quick mode |

---

## Personas

**The Organiser** — Authenticated user. Creates trips/events, scans receipts, manages members, requests settlements. Has an account.

**The Member** — No account required. Accessed via shared link or personal email invite. Can view balances, confirm payments, and optionally sign up.

---

## Key Principles

- Full mode and Quick mode are available for both trips and events — they are a UI preference, not a product mode
- Authentication is required only for the Organiser — Members access via link
- One date = Event. Multiple dates = Trip. This is the single data model distinction
- The shared link remains open access; email invites are a personal nudge, not a gate
- Password / account requirement for members is an optional per-trip/event setting

---

## User Stories

---

### US-01 — Starting a Trip

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Wants to plan a multi-day group trip |
| **Mode** | Trip |
| **Auth Required** | Yes — Organiser must be signed in |

**Description**

The organiser opens Spl1t and creates a new trip with a name, date range, and tracking mode (individuals or families). They add members by searching phone contacts or typing names and emails manually.

**Steps**

1. Organiser logs in and taps Create Trip
2. Enters trip name, start date, end date, and tracking mode (Individuals / Families)
3. Adds members: search contacts, type name + email, or add name-only placeholder
4. Members with an email receive an invite; name-only members sit pending until email is added
5. Trip generates a shareable link — anyone with the link can access without an account
6. Organiser can optionally require member authentication in trip settings
7. Organiser lands on the trip dashboard, ready to add expenses

**Notes**

> The trip creation flow is intentional and pre-planned — unlike events which can be created on-the-fly from a receipt scan.

---

### US-02 — Starting a Single Event

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Just had dinner / drinks / activity with a group and wants to split it |
| **Mode** | Event |
| **Auth Required** | Yes — Organiser must be signed in |

**Description**

The organiser opens Spl1t and taps New Event or simply taps the receipt/camera button. The event is always single-date. No meal or activity planning — just expenses and settlement.

**Steps**

1. Organiser taps New Event or the camera/receipt button on the home screen
2. If via camera: receipt capture begins immediately, event creation wraps around it
3. App prompts for event name (optional — defaults to date + venue if left blank)
4. Organiser adds party members: pull from contacts, type email, or add name placeholder
5. App saves event and drops organiser into the expense/receipt view
6. No date range — single date only, auto-set to today

**Notes**

> The event creation flow should feel fast and frictionless. If started from a receipt scan, the member-adding step comes after the photo is taken — not before.

---

### US-03 — Scanning a Receipt

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Has a physical or digital receipt to split |
| **Mode** | Both — Trip and Event |
| **Auth Required** | Yes — Organiser must be signed in |

**Description**

The AI Receipt Scanner is a prominent second mode when adding an expense. The organiser photographs the receipt and can complete item mapping immediately or defer it — the task stays pending so they don't have to map items at the restaurant.

**Steps**

1. Organiser taps Add Expense and sees two clear options: Manual Entry and AI Receipt Scanner
2. Selects AI Receipt Scanner — camera opens immediately
3. Photograph taken; receipt uploads to storage and a pending expense record is created
4. App confirms: "Receipt saved — map items when you're ready" — organiser can exit now
5. AI processes the image and extracts line items (name, quantity, unit price, line total) and grand total
6. When ready, organiser opens the pending expense and reviews the extracted item table
7. Organiser corrects any misread items inline
8. Organiser assigns each item to one or more members (tap member names per item)
9. Tip is entered separately and split equally among all members regardless of what they ordered
10. App validates: sum of all assigned items + tip must equal receipt total before submission
11. On submit, individual owed amounts are calculated per member and stored consistently with manual expenses

**Notes**

> The deferred mapping flow is critical for real-world use — nobody wants to map items at the table. Pending receipts must be clearly surfaced in the trip/event view so they are not forgotten.

---

### US-04 — Adding a Manual Expense

| | |
|---|---|
| **Persona** | Organiser (or Member with link access) |
| **Trigger** | Paid for something and wants to log it |
| **Mode** | Both — Trip and Event |
| **Auth Required** | No — accessible via shared link |

**Description**

Standard expense entry. Available in Quick mode (minimal taps) and Full mode (full control over split method and participants).

**Steps**

1. Tap Add Expense and select Manual Entry
2. **Quick mode:** Enter amount, select payer, split equally — done in 3 taps
3. **Full mode:** Enter amount, description, category, select payer, choose split method (equal / percentage / exact amounts), select specific members to include
4. Expense is saved instantly with optimistic UI update
5. Balances update in real time for all members viewing the trip/event

**Notes**

> Quick and Full mode are a UI preference available across both trips and events. The mode toggle should be accessible but not intrusive.

---

### US-05 — Inviting a Member Later

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Added a member without an email and now has their contact info |
| **Mode** | Both |
| **Auth Required** | Yes — Organiser must be signed in |

**Description**

A member was added by name only at the time of trip/event creation. The organiser later taps that member and adds their email. An invite is triggered immediately.

**Steps**

1. Organiser taps a name-only member in the member list
2. Taps Add Email and types or pastes the email address
3. App immediately sends an invite email with the event/trip name, their current balance, and a link to join
4. Member profile updates from "pending" to "invited"
5. If the member later signs up, their account links to the existing member record

**Notes**

> This add-now-invite-later pattern is important for real-world scenarios where the organiser does not have everyone's email at the time of the meal.

---

### US-06 — The Member Experience — Email Invite

| | |
|---|---|
| **Persona** | Member |
| **Trigger** | Receives an email invite to a Spl1t trip or event |
| **Mode** | Both |
| **Auth Required** | No — link access, account optional |

**Description**

A Member receives a personal invite email. They can view their balance, see what they owe, and confirm payment — all without creating an account. Signing up is offered but not required.

**Steps**

1. Member receives email: "You have been added to [Event/Trip name] on Spl1t"
2. Email shows: organiser name, event name, their current balance, who they owe and how much
3. Single CTA button: View My Balance — opens the app via their personal link
4. In the app: full expense breakdown, their share, settlement instructions
5. Confirm Payment button available — one tap marks their payment as pending confirmation
6. Optional: Sign up prompt shown clearly but not blocking any action
7. If they sign up, future trips and events accumulate in their account history

**Notes**

> The email and landing experience must work perfectly without an account. Friction-free is the priority. Account sign-up is the upsell, not the gate.

---

### US-07 — Payment Reminder

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | A member has an outstanding balance and has not settled |
| **Mode** | Both |
| **Auth Required** | Yes — Organiser must be signed in |

**Description**

The organiser can trigger a payment reminder for any member with an outstanding balance. The reminder email includes what they owe and optionally a receipt image. A confirm payment link is included.

**Steps**

1. Organiser views the balances screen and sees outstanding members
2. Taps Send Reminder next to a member
3. Reminder email is sent showing: amount owed, who to pay, payment instructions
4. For single-receipt events: option to attach the receipt image to the email
5. Email contains a Confirm Payment button — one tap from email marks payment as pending
6. Organiser sees payment status update in real time
7. Optional: organiser can schedule automatic follow-up reminders if not settled within N days

**Notes**

> Payment confirmation from email is important for members who will not return to the app. The link should work without an account.

---

### US-08 — Settling Up

| | |
|---|---|
| **Persona** | Organiser and Members |
| **Trigger** | All expenses are in — time to zero out balances |
| **Mode** | Both |
| **Auth Required** | No — Members can confirm via link |

**Description**

The app calculates the optimised payment plan (minimum number of transactions). Both the organiser and members can mark settlements as done — from inside the app or directly from an email link.

**Steps**

1. Organiser or Member views the Settle Up screen
2. App shows the optimised payment plan: who pays whom and how much
3. Each settlement has a status: Pending / Confirmed by payer / Confirmed by receiver / Complete
4. Member can tap Confirm Payment in the app or via the email link — no account required
5. Organiser can manually override any settlement status
6. Balances update in real time as settlements are confirmed
7. When all balances reach zero, the trip/event is marked as Settled

**Notes**

> The optimisation algorithm should minimise the number of transactions — the same system already in the app today.

---

### US-09 — Past Events History

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Wants to review a completed event or find a past group |
| **Mode** | Both |
| **Auth Required** | Yes — account required to see history |

**Description**

Completed trips and single-day events live in a collapsed history section on the home screen. They are accessible but not in the way. Each is read-only after settlement.

**Steps**

1. Home screen shows active trips and events at the top
2. Below active items: a collapsed Past Events section with a count badge
3. Tapping expands the list in reverse chronological order
4. Each row shows: date, event name, total spend, number of members
5. Tapping an item opens a read-only view of all expenses, item splits, and settlement history
6. Past trips have their own collapsed section or tab: Past Trips

**Notes**

> Hidden but discoverable. Not cluttering the main view but available when needed. This is also where the organiser finds past groups to reuse.

---

### US-10 — Returning Organiser — Known Contacts

| | |
|---|---|
| **Persona** | Organiser |
| **Trigger** | Starting a new event with a recurring group |
| **Mode** | Both |
| **Auth Required** | Yes — account required |

**Description**

When adding members to a new trip or event, the organiser is shown suggestions from people they have split with before — not just phone contacts. Recurring groups can be assembled in seconds.

**Steps**

1. Organiser starts a new trip or event and reaches the Add Members step
2. Member picker shows three sources: Recent (people from past events), Contacts (phone), Manual (type email)
3. Recent tab surfaces the most frequent co-splitters with one-tap add
4. Organiser can select an entire past group with one tap to re-invite everyone
5. New members can be mixed in with the returning group
6. Members who have accounts are auto-linked; email-only members get a fresh invite

**Notes**

> This feature has high leverage for frequent users — a group of friends who split dinner monthly should never have to re-enter details.

---

## Summary Matrix

| US# | Story | Trip | Event | Auth Required | Mode |
|---|---|:---:|:---:|---|---|
| US-01 | Starting a Trip | Yes | - | Organiser | Trip |
| US-02 | Starting a Single Event | - | Yes | Organiser | Event |
| US-03 | Scanning a Receipt | Yes | Yes | Organiser | Both |
| US-04 | Adding a Manual Expense | Yes | Yes | No | Both |
| US-05 | Inviting a Member Later | Yes | Yes | Organiser | Both |
| US-06 | Member — Email Invite | Yes | Yes | No | Both |
| US-07 | Payment Reminder | Yes | Yes | Organiser | Both |
| US-08 | Settling Up | Yes | Yes | No | Both |
| US-09 | Past Events History | Yes | Yes | Organiser | Both |
| US-10 | Returning Organiser | Yes | Yes | Organiser | Both |

---

## Open Questions for Product Decisions

The following items were identified during story writing and require decisions before implementation:

1. When a member confirms payment from an email link, does the organiser need to also confirm to mark it complete — or is one-side confirmation enough?
2. Should members be able to add expenses to a trip/event (via shared link), or only the organiser?
3. What is the default number of days before an automatic payment reminder is sent, if the organiser enables it?
4. For the AI receipt scanner, what happens if the receipt total does not match after mapping — should the app allow a forced override or block submission?
5. Should past events be visible to all members who were part of them, or only to the organiser who created them?
6. For the recurring group feature (US-10), should the organiser be able to save named groups (e.g. "Friday Crew") or just see suggestions from history?
