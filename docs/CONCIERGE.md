# Travel Concierge — Claude Code Prompt
# File: docs/CONCIERGE.md
# Add this file to the repo. Claude Code should read it in full before starting any work.

---

## BEFORE YOU START

1. Read PLAN.md
2. Read CLAUDE.md
3. Read docs/BRAND.md — every UI decision must match Spl1t's existing style
4. Read src/components/ — understand existing component patterns before writing new ones
5. Read src/styles/ or tailwind.config.js — use existing tokens only, no new colours
6. Read existing trip/event screens — the concierge must feel like it belongs in the same app

Do not write a single line of code before completing the above reads.
Ask questions if anything is ambiguous. Do not assume.

---

## OBJECTIVE

Build the Travel Concierge module for Spl1t in stages.
This is a self-contained feature that can later be extracted as a standalone product.

The concierge is an AI-powered planning assistant. The user describes a trip or event in
natural language. Claude searches for real options, builds a structured step-by-step plan,
and keeps that plan updated as the conversation evolves. The user follows the plan like a
checklist — clicking out to book things externally, checking them off when done.

No bookings happen inside Spl1t. The concierge finds, links, and plans. The user books.

---

## REFERENCE USE CASE

Use this scenario to build, test, and validate every stage of the work:

  "I want to rent an RV in Estonia July 24–31, take the ferry to Helsinki,
   and spend about 5 days exploring Finland with my wife."

Expected full agent behaviour:
  1. Confirm understanding back to user in one sentence
  2. Ask any single missing critical question (e.g. budget range) — one at a time
  3. Search for RV rentals in Tallinn → return 2–3 options with prices + links
  4. Search for Tallinn→Helsinki ferry with vehicle → return operator options + pricing
  5. Propose a Finland itinerary (Helsinki → Turku archipelago → back south)
  6. Build a TripPlan with all legs, cost estimates, and booking URLs
  7. Render the living plan panel alongside the chat, updated in real time
  8. Allow the user to say "skip Tampere" or "find a cheaper ferry" and update only
     the affected steps, preserving the rest of the plan and its checked state

---

## MODULE STRUCTURE

All concierge code lives in src/concierge/. One-way dependency: Spl1t imports from
concierge; concierge never imports from Spl1t trip/expense/member code.

```
src/concierge/
  ConciergeScreen.jsx       ← top-level screen, owns layout (chat + plan panel)
  ConciergeChat.jsx         ← left pane: conversation UI
  ConciergePlan.jsx         ← right pane (desktop) / bottom sheet (mobile): living plan
  PlanStep.jsx              ← individual step card in the plan panel
  useConcierge.js           ← hook: conversation state, plan state, API calls
  conciergeApi.js           ← Anthropic API wrapper with tool-use loop
  conciergeTools.js         ← tool definitions (web_search, fetch_url)
  planDiff.js               ← utility: diff old plan vs new plan, return change set
  types.js                  ← shared types and constants
```

---

## DATA MODELS

### Step

Each item in the living plan is a Step. This is the core data unit.

```javascript
{
  id: string,                  // stable across plan updates, e.g. "step_rv_rental"
                               // IDs must be semantic and consistent so diffs work correctly

  type: "rental"               // vehicle / RV / car hire
       | "transport"           // ferry, flight, train, bus
       | "accommodation"       // campsite, hotel, cottage, airbnb
       | "activity"            // things to do, restaurants, events
       | "admin",              // visa, insurance, permit — non-bookable steps

  title: string,               // short, action-oriented: "Rent RV — Eazy Camper"
  description: string,         // 1–2 sentences: what, where, why this option
  date: "YYYY-MM-DD" | null,   // null if flexible / not yet pinned
  location: string,            // city or region name

  estimated_cost_eur: number,  // total cost for this step (not per person)
  split: "per_person"          // each member pays their own (e.g. flights)
        | "equal"              // shared cost split equally (e.g. accommodation)
        | "organiser",         // organiser pays, settles later (e.g. car rental)

  booking_url: string | null,  // direct link to where this can be booked
  provider: string | null,     // e.g. "Eazy Camper", "Tallink Silja", "Airbnb"

  status: "suggested"          // agent added it, user hasn't confirmed yet
         | "todo"              // user confirmed they want this step
         | "done"              // user has completed / booked this step
         | "skipped",          // user explicitly removed or skipped this step

  source_message_id: string,   // ID of the chat message that created this step
                               // used to link back if user wants to discuss a step

  updated_in_message_id: string | null,  // ID of message that last modified this step
  is_new: boolean,             // true for one render cycle after being added (animation)
  is_updated: boolean,         // true for one render cycle after being modified (animation)
}
```

### TripPlan

The full plan output from Claude. Rendered in ConciergePlan.

```javascript
{
  title: string,
  dates: {
    start: "YYYY-MM-DD",
    end: "YYYY-MM-DD"
  },
  members: number,
  destination_summary: string,   // one-line summary: "Estonia → Finland by RV"
  steps: Step[],                 // ordered array, chronological

  total_estimated_cost_eur: number,
  cost_per_person_eur: number,

  version: number,               // increments on every plan update
  last_updated_message_id: string,
}
```

### Message

```javascript
{
  id: string,
  role: "user" | "assistant",
  content: string,               // markdown
  timestamp: Date,
  tool_calls: ToolCall[] | null, // if Claude called tools during this turn
  plan_version: number | null,   // if this message produced a plan update
}
```

---

## PLAN DIFF BEHAVIOUR

This is critical. When the user modifies the plan mid-conversation (e.g. "skip Tampere",
"find a cheaper ferry", "add one more night in Helsinki"), Claude must not regenerate the
whole plan from scratch.

Instead:
- Claude returns only a partial update: which steps to add, modify, or remove
- planDiff.js applies this patch to the existing plan
- Only the affected steps animate; the rest stay static

### planDiff.js

```javascript
// Input: current plan steps + patch from Claude
// Output: new steps array with is_new / is_updated / removed flags applied

function applyPlanPatch(currentSteps, patch) {
  // patch shape:
  // {
  //   add: Step[],
  //   update: Partial<Step>[],   // matched by id
  //   remove: string[],          // array of step ids to mark as skipped
  // }
}
```

Claude's system prompt instructs it to return a patch object (not a full new plan) when
updating an existing plan. See system prompt section below.

### Animation rules (use CSS transitions, not libraries):
- New step: fade in + slide down over 300ms
- Updated step: brief coral (#e8613a) border pulse over 400ms, then settles
- Removed/skipped step: fade to 40% opacity, strikethrough on title, stays visible
- Checked off (done): checkmark fills with coral, title gets light strikethrough

---

## LAYOUT

### Desktop (≥768px)

Two-column layout. Chat left, plan right. Both full height.

```
┌─────────────────────────┬──────────────────────────┐
│  ← Back    Plan a Trip  │  📋  Estonia → Finland   │
│─────────────────────────│  Jul 24–31 · 2 people    │
│                         │──────────────────────────│
│  [agent message]        │  ☐ Rent RV               │
│                         │    Eazy Camper · Tallinn  │
│  [user message]         │    ~€1,660 · 7 nights    │
│                         │    [Book →]              │
│  [agent message]        │                          │
│  Searching for ferries  │  ☐ Ferry to Helsinki     │  ← updated pulse
│  ·····                  │    Tallink Silja · Jul25 │
│                         │    ~€180 (vehicle)       │
│                         │    [Book →]              │
│                         │                          │
│                         │  ☐ Helsinki – Day 1      │
│                         │    Rastila Camping       │
│                         │    [View →]              │
│                         │                          │
│─────────────────────────│──────────────────────────│
│  [input field     ] [➤] │  Est. total: ~€1,240     │
│                         │  Per person: ~€620       │
│                         │  [Import to Spl1t trip]  │
└─────────────────────────┴──────────────────────────┘
```

- Left col: ~55% width
- Right col: ~45% width, scrollable independently
- Header bar spans full width, same style as existing Spl1t screen headers
- Import button at bottom of right col, sticky

### Mobile (<768px)

Single column. Chat is full screen. Plan is a **bottom sheet**.

- Bottom sheet default state: collapsed, shows only title + step count + cost summary
  (height ~80px, peeking above the input bar)
- Tap the sheet handle to expand it to ~70% screen height (scrollable step list)
- Swipe down to collapse back
- When a plan update happens: sheet briefly bounces up 6px and back (haptic-like cue)
- Badge on the sheet handle: shows number of new/updated steps since user last opened it

The input bar sits above the collapsed sheet at all times.

Use the same bottom sheet pattern as any existing sheet in Spl1t. If none exists,
build a simple one — no external library. CSS + touch events only.

---

## VISUAL STYLE

CRITICAL: Read docs/BRAND.md before touching any UI element.
Match every decision to what already exists in Spl1t. Do not invent new patterns.

Key rules:
- Primary brand colour: coral (#e8613a) — action buttons, checkmarks, active states
- Use existing Tailwind config tokens for all spacing, type, radius, shadow
- Step cards: same card style as expense cards in the existing app
- "Book →" links: same style as external link CTAs elsewhere in the app
- Status badges on steps: same pill/badge pattern as existing status indicators
- Typography: same font stack, same size scale — do not introduce new sizes
- The plan panel should feel like a natural extension of the trip detail screen

If you cannot find a matching pattern in the existing codebase for something new,
flag it and ask before inventing one.

---

## CLAUDE API INTEGRATION

### conciergeApi.js

Model: claude-sonnet-4-20250514
Max tokens: 4096

Route API calls through the existing server function / env var pattern in the codebase.
Never expose the Anthropic API key in client-side code.

Handle the full tool-use loop:
1. Send messages + tools to API
2. If response contains tool_use blocks → execute the tool → append tool_result → loop
3. Continue until response is text-only (stop_reason: "end_turn")
4. Return final text response + any plan update embedded in the response

### System prompt (pass on every request):

```
You are a travel concierge assistant inside Spl1t, a trip cost-splitting app.
Your job is to help users plan trips and events, then produce a structured
step-by-step plan they can follow to make it happen.

BEHAVIOUR RULES:
- Confirm your understanding of the user's intent in one sentence before searching.
  Format: "Got it — [summary of what you understood]. Let me search for options."
- If critical info is missing, ask ONE question at a time. Never present a form.
- Use your tools to search for real, current options. Do not fabricate prices or URLs.
- Return a shortlist of 2–3 options per category. Never dump raw lists.
- Once you have enough to build a plan, output a structured plan (schema below).
- When the user modifies the plan, output only a patch — not a full new plan.
- Never book anything. Always provide direct booking links.
- Keep responses concise. Bullet points for options. Prose for explanations.

PLAN OUTPUT:
When you have enough information to build a full plan, output the following
JSON block at the END of your message, after your conversational response.
Wrap it in <trip_plan> tags:

<trip_plan>
{
  "title": "...",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "members": 2,
  "destination_summary": "...",
  "steps": [ ... ],  // full Step array, ordered chronologically
  "total_estimated_cost_eur": 0,
  "cost_per_person_eur": 0
}
</trip_plan>

PLAN PATCH OUTPUT:
When the user asks to modify an existing plan, output a patch at the END
of your message. Wrap it in <trip_plan_patch> tags:

<trip_plan_patch>
{
  "add": [],       // new Step objects to insert
  "update": [],    // partial Step objects (must include id), merged into existing
  "remove": []     // array of step ids to mark as skipped
}
</trip_plan_patch>

STEP IDs:
Use semantic, stable IDs based on the step content.
Examples: "step_rv_rental", "step_tallinn_helsinki_ferry", "step_helsinki_day1"
Never use random IDs. IDs must be consistent so patches can find them.

COST ESTIMATES:
Always provide estimated costs in EUR, even if rough.
For the split field use:
  "per_person" — each person pays separately (e.g. tickets, flights)
  "equal"      — shared cost split between all members (e.g. accommodation, RV)
  "organiser"  — one person pays and settles with the group later
```

---

## TOOL DEFINITIONS (conciergeTools.js)

```javascript
export const conciergeTools = [
  {
    name: "web_search",
    description: `Search the web for travel options including RV/campervan rentals,
      ferry routes and prices, campsites, hotels, cottages, activities, restaurants,
      local events, and travel logistics. Use specific queries.
      Examples: "RV rental Tallinn July 2025", "Tallinn Helsinki ferry motorhome price",
      "best campsites Finland archipelago RV"`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Specific search query. Keep it focused, 3–8 words."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "fetch_url",
    description: `Fetch the content of a specific URL to get pricing details,
      availability info, or specifics about a rental, campsite, or booking page.
      Only use URLs returned by web_search or provided by the user.`,
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL including https://"
        }
      },
      required: ["url"]
    }
  }
]
```

---

## useConcierge.js — STATE SHAPE

```javascript
{
  messages: Message[],           // full conversation history
  plan: TripPlan | null,         // current living plan
  isLoading: boolean,            // true while API call in flight
  toolStatus: string | null,     // e.g. "Searching for RV rentals in Tallinn..."
                                 // shown in chat while tool calls are running
  error: string | null,
}
```

Key functions the hook exposes:
- `sendMessage(text)` — appends user message, calls API, handles tool loop,
  parses plan/patch from response, updates state
- `markStepDone(stepId)` — toggles step status between "todo" and "done"
- `markStepSkipped(stepId)` — marks step as skipped (keeps it visible, faded)
- `importPlan()` — calls onImportPlan prop with current plan (Spl1t handles the rest)

---

## CONCIERGE SCREEN ENTRY POINT

Add a "Plan" tab to the main navigation. Match the existing tab style exactly —
same height, same font, same active indicator colour (coral), same inactive style.

Tab label: "Plan"
Tab icon: use the same icon library already in use in the app — pick a map/compass/
route icon that fits the existing icon style.

ConciergeScreen is the screen behind this tab. It handles the two-column / bottom-sheet
layout switch based on viewport width.

Pass `onImportPlan` down through ConciergeScreen → ConciergeChat/ConciergePlan.
The parent (App or router) handles what happens when a plan is imported into Spl1t —
this is out of scope for this PR.

---

## IMPLEMENTATION STAGES

Work through these in order. Complete and verify each stage before moving to the next.
Commit at the end of each stage.

### Stage 1 — Data layer (no UI)
- [ ] types.js — Step, TripPlan, Message, ToolCall types/constants
- [ ] planDiff.js — applyPlanPatch utility with unit tests
- [ ] conciergeTools.js — tool definitions
- VERIFY: planDiff correctly handles add/update/remove without mutating input

### Stage 2 — API layer (no UI)
- [ ] conciergeApi.js — full tool-use loop, plan/patch XML parser
- VERIFY: run reference use case against real API, check tool calls fire,
  check plan JSON is parsed correctly from <trip_plan> tags

### Stage 3 — State hook
- [ ] useConcierge.js — conversation state, calls conciergeApi, applies patches
- VERIFY: sendMessage updates messages; plan updates correctly on each turn;
  markStepDone toggles status; toolStatus shows/clears correctly

### Stage 4 — Chat UI only (no plan panel yet)
- [ ] ConciergeChat.jsx — message list, input bar, typing indicator, tool status line
- [ ] Wire to useConcierge
- VERIFY: messages render correctly (markdown); tool status appears/disappears;
  style matches existing Spl1t UI; works on mobile viewport

### Stage 5 — Plan panel (desktop)
- [ ] PlanStep.jsx — single step card with status, cost, booking link, checkbox
- [ ] ConciergePlan.jsx — step list, totals, import button
- [ ] Wire plan updates with diff animations
- VERIFY: plan appears after first agent plan output; step updates animate correctly;
  checked steps persist across plan updates; style matches existing card components

### Stage 6 — Mobile bottom sheet
- [ ] Add bottom sheet behaviour to ConciergePlan
- [ ] Collapsed state, expanded state, update bounce animation, unread badge
- VERIFY: sheet collapses/expands smoothly; badge appears on plan update;
  input bar never overlaps sheet handle

### Stage 7 — Navigation
- [ ] Add "Plan" tab to main nav
- VERIFY: tab matches existing tab style exactly; active state uses coral;
  navigation works on all existing routes

### Stage 8 — End-to-end test
- [ ] Run full reference use case: RV Estonia → Finland July 24–31
- [ ] Verify: understanding confirmation → tool searches → plan appears →
  modify "skip Tampere" → only that step updates → mark RV step done →
  stays done after next plan update → Import to Spl1t button fires onImportPlan
- [ ] Test on mobile viewport: bottom sheet, badge, input bar

---

## RULES

- Read BRAND.md before any UI work. No exceptions.
- Match existing Spl1t component and style patterns. Flag gaps, don't invent.
- All new code in src/concierge/ only — nothing else in the codebase changes in this PR.
- No new npm dependencies unless truly unavoidable. Check package.json first.
- API key must never appear in client code — use existing env var / server pattern.
- planDiff must never mutate the existing steps array — always return a new array.
- Step IDs must be semantic and stable — random IDs will break the diff system.
- The concierge module must remain self-contained. If you find yourself importing
  from outside src/concierge/, stop and reconsider the architecture.
- Do not merge yourself.

---

## PR

Branch: feat/travel-concierge
Title: feat: add AI travel concierge module

Description:
  Adds src/concierge/ — a self-contained AI travel planning module
  powered by Claude with tool use (web_search, fetch_url).

  Core UX: split-pane chat + living plan panel. The plan updates
  incrementally as the conversation evolves, using a patch/diff
  system so checked-off steps survive plan modifications.

  Mobile: bottom sheet with collapsed/expanded states and an
  unread-update badge.

  Entry point: ConciergeScreen behind a new "Plan" nav tab.
  Import interface: onImportPlan(TripPlan) prop for Spl1t integration.

  Validated against reference use case:
  Estonia RV rental → Tallinn→Helsinki ferry → Finland 5-day itinerary.

  Scope: planning and linking only. No bookings, no payments,
  no changes to existing trip/event/expense functionality.
