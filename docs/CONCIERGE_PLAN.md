# Travel Concierge Module — Implementation Plan

> **Living document.** Read this before starting any concierge implementation work.
> Last updated: 2026-03-08

## Context

Spl1t needs an AI-powered travel planning assistant. Users describe a trip in natural language, Claude searches for real options (flights, ferries, accommodation), and builds a structured step-by-step plan that updates incrementally via a patch/diff system. No bookings happen inside the app — the concierge finds, links, and plans; the user books externally.

The module is self-contained in `src/concierge/` and can later be extracted as a standalone product. A new Supabase Edge Function handles the Anthropic API calls + tool-use loop server-side (API key never in client code).

**Entry point:** Standalone at `/concierge` (accessible from home page CTA). NOT trip-scoped — the whole point is to plan a trip before it exists. The "Import to Spl1t" button creates a new trip from the finished plan. No "Plan" tab in the trip bottom nav.

**Full spec:** `docs/CONCIERGE.md` (data models, system prompt, layout wireframes, animation rules, visual style rules)

---

## Decisions Made

- **Web search:** Upgrade `@anthropic-ai/sdk` to latest, use Anthropic's native built-in `web_search` tool. No extra API keys needed.
- **Entry point:** Standalone `/concierge` route, not trip-scoped. Accessible from home page CTA.
- **State persistence:** localStorage (`spl1t:concierge:standalone`), no DB tables for MVP.
- **Streaming:** Non-streaming for MVP. Cosmetic "Searching..." status while loading.
- **Markdown rendering:** Minimal regex-based renderer (bold, italic, links, lists). No new npm dependency.

---

## Stage 1 — Data Layer (no UI)

**Files to create:**

- `src/concierge/types.ts` — All type definitions: `Step`, `TripPlan`, `Message`, `PlanPatch` (add/update/remove ops), `ToolCallStatus`. Use types from `docs/CONCIERGE.md` data models section.
- `src/concierge/planDiff.ts` — `applyPlanPatch(currentSteps, patch)` — pure, immutable function. Handles add (insert after ID or append), update (merge fields by step ID), remove (mark as skipped). Recalculates totals after patching. Step IDs are semantic strings (e.g. `step_rv_rental`).
- `src/concierge/planDiff.test.ts` — Unit tests: add, update, remove, combined patch, empty patch no-op, unknown ID no-op
- `src/concierge/conciergeTools.ts` — Tool definition objects for `web_search` and `fetch_url` (matching Anthropic tool schema format)

**Verify:** `npm test` — planDiff tests pass, no mutation of inputs.

---

## Stage 2 — API Layer (no UI)

**New Edge Function:** `supabase/functions/concierge/index.ts`

Pattern: follows `supabase/functions/process-receipt/index.ts` exactly (CORS, JWT auth via `_shared/auth.ts`, Anthropic SDK, logging via `_shared/logger.ts`).

**Tool-use loop (runs entirely server-side):**
1. Build messages array with system prompt + conversation history + current plan context
2. Call `anthropic.messages.create()` with tools (web_search as Anthropic built-in, fetch_url as custom), model `claude-sonnet-4-20250514`, max_tokens 4096
3. While `stop_reason === 'tool_use'` (max 5 iterations):
   - `web_search` → handled natively by Anthropic API
   - `fetch_url` → HTTP fetch in Deno, strip HTML tags, truncate to 4000 chars, 10s timeout
   - Append tool results → call Claude again
4. Extract final text, parse `<trip_plan>` or `<trip_plan_patch>` XML tags, strip tags from returned content
5. Return: `{ content, plan?, planPatch?, toolsUsed, usage }`

**Client wrapper:** `src/concierge/conciergeApi.ts`
- Calls `supabase.functions.invoke('concierge', { body: { messages, currentPlan } })`
- Wrapped in `withTimeout(55000, 'Planning request timed out')` (Edge Function budget)

**System prompt:** From `docs/CONCIERGE.md` — instructs Claude to confirm understanding, ask one question at a time, use tools for real data, return structured plan in `<trip_plan>` or `<trip_plan_patch>` XML tags. Step IDs must be semantic and stable.

**Action:** `npm install @anthropic-ai/sdk@latest` + update Edge Function import version.

**Verify:** Deploy Edge Function (`supabase functions deploy concierge`), test via curl.

---

## Stage 3 — State Hook

**File:** `src/concierge/useConcierge.ts`

```typescript
export function useConcierge(): {
  messages: ConciergeMessage[]
  plan: TripPlan | null
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  markStepDone: (stepId: string) => void
  markStepSkipped: (stepId: string) => void
  clearConversation: () => void
}
```

- State persisted to localStorage key `spl1t:concierge:standalone` (messages + plan, max 50 messages)
- `sendMessage`: appends user msg → calls API → if response has `plan` replace it, if `planPatch` apply via `applyPlanPatch` → appends assistant msg
- `markStepDone`/`markStepSkipped`: local plan mutation only, persist to localStorage
- No trip context needed — standalone. Trip details emerge from the conversation.

**Verify:** Hook returns correct state after sendMessage, plan updates correctly on patch.

---

## Stage 4 — Chat UI

**Files:**
- `src/concierge/ConciergeChat.tsx` — Message list + input bar
- `src/concierge/markdownRenderer.tsx` — Minimal regex-based markdown→JSX (bold, italic, links, lists, line breaks). No new dependency.

**Message bubbles:**
- User: `bg-primary/10 text-foreground` right-aligned, `rounded-lg rounded-tr-sm`
- Assistant: `bg-card soft-shadow` left-aligned, `rounded-lg rounded-tl-sm`
- Both: `px-3 py-2 text-sm max-w-[85%]`

**Input bar:**
- Auto-expanding `textarea` (1–4 rows), existing Input styling (`rounded-lg border-input`)
- Send button: existing `Button` with `Send` icon (lucide), disabled when empty/loading

**Loading state:** Typing indicator (3 animated dots). Cosmetic tool status: "Searching for options..."

**Verify:** Messages render with markdown; loading shows/hides; matches Spl1t visual style.

---

## Stage 5 — Plan Panel (desktop)

**Files:**
- `src/concierge/PlanStep.tsx` — Step card: checkbox (plain `<span>`, NOT Radix Checkbox), title, description, date/location chips, cost badge, booking link (`ExternalLink` icon). Status: done=strikethrough+opacity-60, skipped=opacity-40+dashed border. Uses `listItem` framer-motion variant.
- `src/concierge/ConciergePlan.tsx` — Step list with `listContainer` stagger, plan header (title + dates + member count), totals footer (total cost + per-person), "Import to Spl1t" button (disabled MVP, tooltip "Coming soon")

**Card styling:** `rounded-lg bg-card soft-shadow p-3` with `whileHover={{ y: -2 }}` — matches existing expense cards.

**Diff animations (CSS transitions):**
- New step: fade-in + slide-down 300ms
- Updated step: brief coral border pulse 400ms
- Skipped: fade to opacity-40, strikethrough on title
- Done: coral checkmark fill, light strikethrough

**Verify:** Plan appears after first agent response; step checks persist across plan updates.

---

## Stage 6 — Mobile Bottom Sheet

**File:** `src/concierge/ConciergeSheet.tsx`

Follow `docs/CARD_SHEET_STANDARD.md` §2 exactly:
- `SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"`
- Header (`shrink-0`): spacer | SheetTitle "Trip Plan" | ✕ close (standard close button pattern)
- Body: `ref={scrollRef}` from `useIOSScrollFix()`, `flex-1 overflow-y-auto overscroll-contain`
- Height: `75dvh` fixed (read-only → no `useKeyboardHeight`)
- Footer: `pwa-safe-bottom` if showing "Import to Spl1t" button
- Contains `ConciergePlan` component

**Collapsed summary** (inline in ConciergeChat above input bar):
- Tappable bar: `rounded-lg bg-card soft-shadow p-2`
- Shows: plan title, step count badge, total cost
- Tap opens the sheet

**Breakpoint:** `useMediaQuery('(max-width: 767px)')` — mobile shows sheet, desktop shows side panel.

**Verify:** Sheet collapses/expands; input bar never overlaps.

---

## Stage 7 — Navigation Integration

### `src/routes.tsx` — Add route (NOT trip-scoped)
```tsx
<Route path="concierge" element={<ErrorBoundary><ConciergePage /></ErrorBoundary>} />
```

### `src/pages/HomePage.tsx` — Add CTA
"Plan a trip" button on home page. `Compass` icon. Links to `/concierge`. Auth-gated.

### `src/concierge/ConciergePage.tsx` — Page component
- Mobile: full-screen chat + collapsible plan sheet
- Desktop: two-column (chat ~55% | plan ~45%)
- Empty state: `Compass` icon (48px muted) + "Plan your trip with AI" + suggestion chips
- Auth-gated (Edge Function verifies JWT)
- Header: back arrow → home + "Plan a Trip" title
- Renders inside existing `<Layout />` route tree

### NOT modified: `src/components/Layout.tsx`

**Verify:** `/concierge` works, back arrow to home, CTA on home page.

---

## Stage 8 — E2E Test

Reference use case: "RV rental in Estonia July 24–31, ferry to Helsinki, 5 days in Finland with my wife."

- [ ] Understanding confirmation → tool searches → plan appears
- [ ] "Skip Tampere" → only that step updates
- [ ] Mark RV step done → stays done after next update
- [ ] Import button visible (disabled MVP)
- [ ] Mobile: bottom sheet + collapsed summary
- [ ] Desktop: two-column, independent scroll
- [ ] `npm run type-check` passes

---

## Files Summary

| New file | Purpose |
|----------|---------|
| `src/concierge/types.ts` | Type definitions |
| `src/concierge/planDiff.ts` | Immutable plan patch utility |
| `src/concierge/planDiff.test.ts` | Unit tests |
| `src/concierge/conciergeTools.ts` | Tool schemas |
| `src/concierge/conciergeApi.ts` | Client wrapper for Edge Function |
| `src/concierge/useConcierge.ts` | State hook |
| `src/concierge/ConciergeChat.tsx` | Chat message list + input |
| `src/concierge/ConciergePlan.tsx` | Plan step list + totals |
| `src/concierge/PlanStep.tsx` | Individual step card |
| `src/concierge/ConciergePage.tsx` | Page component (route target) |
| `src/concierge/ConciergeSheet.tsx` | Mobile plan bottom sheet |
| `src/concierge/markdownRenderer.tsx` | Simple markdown→JSX |
| `supabase/functions/concierge/index.ts` | Edge Function (tool-use loop) |

| Modified file | Change |
|---------------|--------|
| `src/routes.tsx` | Add `/concierge` route (standalone) |
| `src/pages/HomePage.tsx` | Add "Plan a trip" CTA |

---

## Standards Compliance

Every new component MUST follow these docs before implementation:

### `docs/BRAND.md` — Visual identity
- Primary CTA color: coral `#E76F51` (CSS `--primary`)
- Card radius: `rounded-lg` (16px via `--radius`)
- Shadows: `soft-shadow` (8px), `soft-shadow-md` (12px), `soft-shadow-lg` (24px)
- Typography: Inter font, `font-medium` for buttons, `font-semibold` for headings, `font-bold` for amounts
- Icons: lucide-react exclusively, 20px nav / 16px buttons / 48px empty states
- Dark mode: all colors via CSS custom properties, `.dark` class on `<html>`
- Buttons: use existing `Button` component variants (default/ghost/outline/soft/link)
- Animation presets: `src/lib/animations.ts` — `fadeIn`, `fadeInUp`, `listItem`, `listContainer`, `cardHover`
- Reduced motion: respect `prefers-reduced-motion` via `safeAnimate()` wrapper

### `docs/CARD_SHEET_STANDARD.md` — Sheet/Dialog/Card rules
- **ConciergeSheet (mobile plan panel, Stage 6):**
  - MUST be a bottom Sheet on mobile (< 768px), NOT a centered dialog
  - `SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"`
  - Sticky header (`shrink-0`): 3-slot layout (spacer | SheetTitle | ✕ close)
  - Scrollable body: `flex-1 overflow-y-auto overscroll-contain`
  - `useIOSScrollFix()` ref on scroll container
  - Height: `75dvh` (read-only, no inputs → no keyboard hook needed)
  - Close button: `rounded-full w-8 h-8 border border-border hover:bg-muted`
  - `pwa-safe-bottom` on footer if present
  - Never `vh`, never `h-screen`
- **PlanStep cards (Stage 5):**
  - Match existing card pattern: `rounded-lg bg-card soft-shadow p-3`
  - Checkbox: plain `<span>` styled to match, NOT Radix Checkbox (infinite re-render pitfall)
  - Hover: `whileHover={{ y: -2 }}` via framer-motion
- **ConciergePage desktop plan panel:**
  - Not a Dialog — it's a persistent side panel (no overlay). Standard flex layout.
  - Independent scroll: `overflow-y-auto overscroll-contain`

### `docs/CONCIERGE.md` — Feature spec
- Data models (Step, TripPlan, Message), system prompt, layout wireframes, animation rules
- Plan diff behaviour (patch, not full regeneration)
- Step IDs: semantic and stable (e.g. `step_rv_rental`)

---

## Key References

- Full spec + data models + wireframes + system prompt: `docs/CONCIERGE.md`
- Brand/design guide: `docs/BRAND.md`
- Card/Sheet/Dialog standard: `docs/CARD_SHEET_STANDARD.md`
- Sheet audit: `docs/SHEET_AUDIT.md`
- Edge Function pattern: `supabase/functions/process-receipt/index.ts`
- AppSheet pattern: `src/components/ui/AppSheet.tsx`
- Animation presets: `src/lib/animations.ts`
- Existing card components: `src/components/expenses/ExpenseCard.tsx`
