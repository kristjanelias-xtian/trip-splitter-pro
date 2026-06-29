# App Redesign — Kickoff Brief

> **Status:** Framing captured in a brainstorm on 2026-06-29. This is NOT a design spec yet — it is the starting point for a fresh session that will explore visual directions and write the design-system spec. Start there (see "First step in the fresh session").

## Vision

Make Spl1t feel **fluid, modern, polished, and a little fancy — but simple**. Raise the visual and motion quality to a "Claude-grade" level of craft without adding product complexity.

## Scope (decided)

**Visual reskin only.** Screens, flows, information architecture, and routes stay the same. We are changing look, feel, and motion — not behavior.

- **In scope:** design tokens (color, type, spacing, radii, shadows, motion), shared component styling, per-page visual polish, micro-interactions/transitions, light + dark parity.
- **Out of scope:** new navigation model, new flows, route changes, data model changes, backend/RLS changes, the Quick-vs-Full mode structure.

**Why this scoping matters for testing:** because behavior is unchanged, the existing behavioral tests become the contract that must stay green, and visual regression becomes the redesign's own safety net. A reskin that breaks a behavioral test means the reskin overreached.

## Why a token-and-component-first reskin is feasible here

The app already has the infrastructure that makes a broad reskin propagate cleanly:

- **Centralized color tokens:** CSS custom properties in `src/index.css`, with light/dark variants via the `.dark` selector. Re-tokenizing shifts most surfaces at once.
- **shadcn/ui primitives** (`src/components/ui/*`): Button, Card, Input, Select, Sheet, Dialog, etc. Restyling these covers most of the app.
- **Standardized overlays:** `ResponsiveOverlay` (Sheet on mobile < 767px / Dialog on desktop) and the Bottom Sheet Standard (`AppSheet`, `docs/SHEET_AUDIT.md`). One set of patterns to restyle, not eleven.
- **Theme system:** `useTheme` (localStorage `spl1t:theme`), `ThemeToggle`, server sync via `user_preferences.theme_preference`. Already wired for light/dark/system.
- **Two layouts:** `Layout` (Full mode) and `QuickLayout` (Quick mode) with a shared responsive header pattern.

So the migration order is: **tokens → shared primitives/overlays → page-by-page polish → motion**. Most visual change lands in the first two steps.

## Decomposition into sub-projects

Each gets its own spec → plan → execution cycle. Order matters (later depends on earlier).

1. **Design language + tokens** — the foundation. Color system (light + dark), type scale + font choices, spacing scale, radii, elevation/shadows, motion primitives (durations, easing). Output: updated `index.css` token layer + a documented token reference. **This is the first sub-project to spec.**
2. **Core component restyle** — Button, Card, Input/Select, `ResponsiveOverlay`/`AppSheet`, headers (`Layout`/`QuickLayout`), `BalanceCard`, chips/pills, list rows. Behavior untouched; only styling + motion.
3. **Page-by-page migration** — Home, Quick view (`QuickGroupDetailPage`), Dashboard, Expenses, Settlements, Planner, Shopping, Receipts review, Manage Trip. One PR per page or small group.
4. **Motion & polish** — transitions, sheet/overlay motion, micro-interactions, empty states, loading skeletons. The "fluid/fancy" layer.
5. **Test/UAT harness** — built alongside steps 1-3, not after (see below).

## Recommended process for the fresh session

1. Use the **`frontend-design` skill** + the brainstorming **Visual Companion** to generate **2-3 distinct visual directions** (palette, type, a sample screen each — e.g. Dashboard + Quick view). Look, compare, pick one. (Note: there is no separate "Claude Design" product to open; the `frontend-design` skill IS the design engine, and the Visual Companion is the live mock/compare surface.)
2. Once a direction is chosen, write the **design-system spec** (sub-project 1): the concrete token set + component intent.
3. Run that spec through `writing-plans` → execute token + component layers first (subagent-driven works well; that pattern is proven in this repo — see `docs/superpowers/plans/2026-06-27-participant-reassignment.md`).
4. Then page-by-page, each behind visual-regression review.

## Test / UAT strategy

Four layers, so "comprehensive and well-executed" is enforced by automation, not vibes:

1. **Behavior contract (existing, must stay green):** ~348 Vitest unit/component tests + the 26 Playwright E2E smoke tests (13 routes × 2 viewports, Supabase mocked via `e2e/fixtures/supabase-interceptor.ts`). A reskin must not change these.
2. **Visual regression (new, the redesign's net):** Playwright `toHaveScreenshot()` snapshots per **route × viewport × theme** (mobile 375×812 / desktop 1280×720, light / dark). Extend the existing 13-route harness; baselines are reviewed on each page-migration PR. This is what catches unintended visual drift and proves intended change.
3. **Accessibility gates (new):** color-contrast (WCAG AA), minimum tap-target size, visible focus states, reduced-motion support. Can run via Playwright + axe in the same harness.
4. **UAT journeys (new):** scripted end-to-end user flows asserted in Playwright — create trip → add expense → settle up → scan receipt → view balances. These protect the critical paths through the new skin.

Plus the repo norm: **manual iPhone (Safari) pass** on any change touching bottom sheets / `useKeyboardHeight` / `MobileWizard` before merge (`docs/SHEET_AUDIT.md §8.1`). Playwright cannot trigger the real iOS keyboard.

## Constraints to honor (from CLAUDE.md / repo norms)

- **Mobile-first.** Most users are on phones; the Quick view is the hot path.
- **`dvh` not `vh`** for sheet heights; never `100vh`/`h-screen`. iOS keyboard uses top-based positioning (`visualViewport`), not `window.innerHeight`.
- **No `autoFocus`/`ref.focus()`** in sheets/modals (pops the keyboard prematurely).
- **Dark mode parity** — every token and component must look right in both themes.
- **Plain ASCII only** in code/comments/commits (no unicode icons/emojis) — user global rule.
- **Don't break the access model** — this is frontend-only; trips RLS and the URL-as-token model are untouched.
- **Keep the Bottom Sheet Standard and `ResponsiveOverlay` structural contract** (sticky header `shrink-0`, single scroll region, sticky footer). Restyle within it; don't fork it.
- **Decimal inputs** keep `inputMode="decimal"` + comma→dot handling (iOS European locale).

## Surface inventory (what gets migrated in sub-project 3)

Routes (all under `TripRouteGuard`, Full mode in `Layout`, Quick in `QuickLayout`):
`/` Home · `/t/:code/quick` Quick view (+ `/quick/history`) · `/t/:code/dashboard` · `/t/:code/expenses` · `/t/:code/settlements` · `/t/:code/planner` · `/t/:code/shopping` · `/t/:code/manage` · `/create-trip` · `/admin/all-trips` · `/join/:token` · `/remind/:tripCode` · `/trip-not-found/:tripCode`.

High-traffic components to prioritize: `BalanceCard`, the expense wizard (`MobileWizard`/`ExpenseForm`), `ReceiptReviewSheet`, settlement flows, the home trip cards, and the two headers.

## First step in the fresh session

> Open a fresh session, point it at this brief, and say: "Brainstorm the visual design direction for the Spl1t reskin per `docs/superpowers/specs/2026-06-29-redesign-kickoff-brief.md` — generate 2-3 directions to compare, then we'll write the design-system spec (sub-project 1)."

That session should invoke `brainstorming` (for direction selection) and `frontend-design` (to produce the directions), then write the **design-system / token spec** as the first real deliverable.
