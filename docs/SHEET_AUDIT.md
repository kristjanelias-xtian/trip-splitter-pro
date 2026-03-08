# Sheet / Dialog Audit

> Started: 2026-02-24
> Status: COMPLETE
> Purpose: Document every sheet and dialog in the app,
>   define the standard, record every gap found, and
>   track every fix applied.
>
> **As of PR #659:** All sheets use `AppSheet` (via `ResponsiveOverlay`) except
> `ExpenseWizard` and `QuickScanCreateFlow` (multi-step wizards that manage
> their own Sheet/Dialog rendering). All delete confirmations use `AlertDialog`.
> New overlays should use `ResponsiveOverlay` — see `docs/CARD_SHEET_STANDARD.md`.

---

## 1. Inventory

### Radix sheet.tsx baseline (`src/components/ui/sheet.tsx`)

- `SheetContent` renders a default `SheetPrimitive.Close` at `absolute right-4 top-4` with `Cross2Icon` (small unstyled X) **unless `hideClose` prop is passed**
- This absolute X does NOT participate in flex layout — floats on top
- Overlay: `bg-black/80` (good, fully obscures)
- `SheetContent` for `side="bottom"`: `inset-x-0 bottom-0 border-t` + slide animation
- Default padding: `p-6` (most sheets override to `p-0`)

### Bottom Sheets (11 total)

| # | Component | File | Close btn | Header sticky? | useKeyboardHeight? | Height | Scroll | hideClose? | rounded-t-2xl? |
|---|-----------|------|-----------|----|-----|--------|--------|-----|-----|
| 1 | MobileWizard | ExpenseWizard.tsx:481-619 | Radix default (absolute) | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 2 | QuickSettlementSheet | QuickSettlementSheet.tsx:301-527 | Radix default (absolute) | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 3 | QuickCreateSheet | QuickCreateSheet.tsx:26-50 | Radix default (absolute) | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 4 | QuickParticipantSetupSheet | QuickParticipantSetupSheet.tsx:19-48 | Radix default (absolute) | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 5 | QuickScanCreateFlow | QuickScanCreateFlow.tsx:256-402 | Custom X on LEFT (p-1 rounded-md) + Radix default on RIGHT = **TWO X buttons** | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 6 | ReceiptReviewSheet | ReceiptReviewSheet.tsx:371-599 | Radix default (absolute) | Yes (shrink-0, border-b) | Yes | 92dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | **No ❌** |
| 7 | ReceiptCaptureSheet | ReceiptCaptureSheet.tsx:203-324 | Radix default (absolute) | **No ❌** (uses SheetHeader, no shrink-0, no border-b) | **No ❌** | **85vh ❌** | flex-1 flex flex-col overflow-y-auto (header can scroll) | No ❌ | **No ❌** |
| 8 | ReceiptDetailsSheet | ReceiptDetailsSheet.tsx:39-107 | Radix default (absolute) | Partial (border-b but **no shrink-0**) | No (read-only, OK) | **75vh ❌** | flex-1 overflow-y-auto ✅ | No ❌ | **No ❌** |
| 9 | QuickGroupMembersSheet | QuickGroupMembersSheet.tsx:33-89 | Radix default (absolute) | Yes (shrink-0, border-b) | No (read-only, OK) | 75dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 10 | QuickScanContextSheet | QuickScanContextSheet.tsx:32-72 | Radix default (absolute) | Yes (shrink-0, border-b) | No (read-only, OK) | 75dvh ✅ | flex-1 overflow-y-auto ✅ | No ❌ | Yes ✅ |
| 11 | DayDetailSheet | DayDetailSheet.tsx:57-88 | Radix default (absolute) | **No ❌** (uses SheetHeader, no shrink-0, no border-b) | No (read-only, OK) | **70vh ❌** | **overflow-y-auto on entire SheetContent ❌** | No ❌ | **No ❌** |

### Desktop Dialogs (no structural changes needed)

These all use the standard Radix Dialog pattern with DialogHeader/DialogTitle. Close button handled by Radix's built-in X.

| # | Component | File | className | Notes |
|---|-----------|------|-----------|-------|
| 12 | ExpenseWizard (desktop/edit) | ExpenseWizard.tsx:47 | `max-w-2xl max-h-[85vh] overflow-y-auto` | OK |
| 13 | ReportIssueDialog | ReportIssueDialog.tsx | `sm:max-w-md` + keyboard transform | OK (unique keyboard handling via transform) |
| 14 | BankDetailsDialog | auth/BankDetailsDialog.tsx | `max-w-md` | OK |
| 15 | ShareTripDialog | ShareTripDialog.tsx | `sm:max-w-md` | OK |
| 16 | LinkParticipantDialog | LinkParticipantDialog.tsx | `max-w-sm` | OK |
| 17 | CostBreakdownDialog | CostBreakdownDialog.tsx | `max-h-[85vh] overflow-y-auto sm:max-w-xl` | OK |
| 18 | ManageTripPage edit | ManageTripPage.tsx | Dialog + AlertDialog | OK |
| 19 | FamiliesSetup edit family | setup/FamiliesSetup.tsx | `max-w-lg max-h-[85vh] overflow-y-auto` | OK |
| 20+ | TimeSlotGrid, StayCard, ActivityCard, ShoppingItemCard, MealCard | Various | Standard Dialog + AlertDialog | OK |

### Cross-cutting issue: Radix default close button

**Every bottom sheet** currently shows the Radix default `SheetPrimitive.Close` button at `absolute right-4 top-4`. This button:
- Is `absolute` positioned (not in the flex layout)
- Uses `Cross2Icon` (Radix icon, small, unstyled)
- Has `rounded-sm opacity-70` styling
- Floats over whatever content is at the top-right

**The fix for ALL sheets:**
1. Pass `hideClose` to `SheetContent` to suppress the Radix default X
2. Add an explicit close button in the sticky header (right side)
3. Use the standard close button style (defined in Step 1)

---

## 2. The Standard (approved spec)

### 1. Header structure

- The header is always the **first child** of the sheet's flex column.
- It is always `shrink-0` — it never scrolls, never moves, never leaves the viewport.
- It contains three slots in a single flex row (`flex items-center justify-between`):
  - **Left slot:** `← ArrowLeft` back button (multi-step sheets) OR `<div className="w-8" />` spacer (single-screen sheets)
  - **Center:** `<SheetTitle>` — the sheet's title
  - **Right slot:** `✕ X` close button — always present, always reachable
- Below the row: `border-b border-border` hairline separator.

### 2. One dismiss affordance rule

- **Single-screen sheets:** ✕ close only. Left slot = spacer.
- **Multi-step sheets** (MobileWizard, QuickScanCreateFlow): ← back (top-left) navigates to previous step. ✕ close (top-right) dismisses the entire sheet. Both always visible simultaneously.
- **Two-view sheets** (QuickSettlementSheet): ← back (top-left) returns to previous view. ✕ close (top-right) dismisses.
- **Step 1 of multi-step:** Left slot = spacer (no back button — there's nowhere to go back to).
- **NEVER** show ← and ✕ where both do the same thing (close the sheet).

### 3. Close button appearance — IDENTICAL on every sheet

```tsx
<button
  onClick={onClose}
  aria-label="Close"
  className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
>
  <X className="w-4 h-4 text-muted-foreground" />
</button>
```

Back button uses the same container style with `<ArrowLeft>` icon instead of `<X>`.

No variations. No plain X without circle. No oversized X. No Radix default absolute X. Always this exact markup.

### 4. Required flex structure (reference JSX)

```tsx
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent
    side="bottom"
    hideClose                  {/* suppress Radix default absolute X */}
    className="flex flex-col p-0 rounded-t-2xl"
    style={{
      height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
      ...(keyboard.isVisible && {
        top: `${keyboard.viewportOffset}px`,
        bottom: 'auto',
      }),
    }}
  >
    {/* STICKY HEADER — never scrolls */}
    <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
      {onBack
        ? <button onClick={onBack} aria-label="Go back"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        : <div className="w-8" />
      }
      <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
      <button onClick={onClose} aria-label="Close"
        className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>

    {/* SCROLLABLE CONTENT — only this scrolls */}
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
      {children}
    </div>

    {/* STICKY FOOTER — never scrolls (omit if no CTA) */}
    {footer && (
      <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
        {footer}
      </div>
    )}
  </SheetContent>
</Sheet>
```

### 5. Keyboard handling — header must not move

Two distinct failure modes, both must be fixed:

**FAILURE A** — keyboard obscures the active input or CTA:
Fix: `useKeyboardHeight()` + inline style adjusts sheet height/bottom.

**FAILURE B** — the entire sheet shifts upward and the header leaves the viewport:
Requires ALL FOUR fixes applied together:

1. **Use `dvh` not `vh`** — `dvh` recalculates when the keyboard opens on iOS. `vh` does not. Primary cause of header shift.
2. **Sheet anchored to bottom** — Radix `side="bottom"` handles this IF height is `dvh`. Don't override positioning.
3. **Flex structure absorbs the resize** — `flex flex-col` + `dvh` height: when viewport shrinks, only `flex-1` content area shrinks. Header (`shrink-0`) stays pinned.
4. **Never use absolute/fixed positioning for the header** — only flex `shrink-0`.

All sheets with inputs: apply all four fixes + `useKeyboardHeight`.
Read-only sheets: apply fixes 1-3 (no keyboard hook needed).

### 6. Height values

| Sheet type | Height |
|-----------|--------|
| Standard (forms, inputs, multi-step) | `92dvh` (default), `availableHeight px` when keyboard open |
| Partial (read-only, pickers, confirmations) | `75dvh` fixed |
| Desktop dialogs | No sheet height — standard Dialog pattern |

Always `dvh`. **Never** `vh`. **Never** `100vh`. **Never** `h-screen`.

### 7. Background bleed-through

- Overlay: `bg-black/80` in `sheet.tsx` — already correct.
- Below-keyboard bleed: fixed by top-based positioning (`top: viewportOffset`, `bottom: 'auto'`) from rule 5.

### 8. Scroll behaviour

- Content div is the **ONLY** scrollable region.
- `overscroll-contain` on content div prevents scroll chaining to background.
- Header **never** scrolls — it's outside the scroll container, `shrink-0`.
- Footer **never** scrolls — it's outside the scroll container, `shrink-0`.
- `overflow-y-auto` ONLY on content div. **NEVER** on `SheetContent` itself.

### 9. Scope — what does NOT change

- Desktop Dialogs: no changes (standard Radix Dialog pattern).
- AlertDialogs: no changes.
- `sheet.tsx` primitive: not modified — just use existing `hideClose` prop.

---

## 3. Gap Analysis

### Gap table

| # | Component | hideClose | Close btn standard? | Header 3-slot layout? | Header shrink-0? | dvh? | overscroll-contain? | Keyboard handled? | rounded-t-2xl? | Verdict |
|---|-----------|-----------|--------------------|-----------------------|-----------------|------|--------------------|--------------------|----------------|---------|
| 1 | MobileWizard | ❌ | ❌ Radix default | ❌ Title+progress only, no close/back in header | ✅ | ✅ | ❌ missing | ✅ | ✅ | 🔧 Minor — add hideClose, add close btn to header, add overscroll-contain. Back/next stay in footer (wizard pattern). |
| 2 | QuickSettlementSheet | ❌ | ❌ Radix default | ❌ ArrowLeft inside SheetTitle text (back competes with Radix X) | ✅ | ✅ | ❌ missing | ✅ | ✅ | 🔧 Minor — add hideClose, refactor header to 3-slot layout with proper back btn + close btn, add overscroll-contain. |
| 3 | QuickCreateSheet | ❌ | ❌ Radix default | ❌ Title only, no close btn | ✅ | ✅ | ❌ missing | ✅ | ✅ | 🔧 Minor — add hideClose, add close btn + spacer, add overscroll-contain. |
| 4 | QuickParticipantSetupSheet | ❌ | ❌ Radix default | ❌ Title+description only, no close btn | ✅ | ✅ | ❌ missing | ✅ | ✅ | 🔧 Minor — add hideClose, add close btn + spacer, add overscroll-contain. |
| 5 | QuickScanCreateFlow | ❌ | ❌ TWO X buttons (custom left + Radix right) | ❌ Custom X on LEFT, title center, "Done" btn right | ✅ | ✅ | ❌ missing | ✅ | ✅ | 🔧 Moderate — add hideClose, move close btn to RIGHT per standard, remove left X, add overscroll-contain. |
| 6 | ReceiptReviewSheet | ❌ | ❌ Radix default | ❌ Title only, no close btn | ✅ | ✅ | ❌ missing | ✅ | ❌ | 🔧 Minor — add hideClose, add close btn + spacer, add rounded-t-2xl, add overscroll-contain, change footer inline style to class. |
| 7 | ReceiptCaptureSheet | ❌ | ❌ Radix default | ❌ Uses SheetHeader (not sticky) | ❌ No shrink-0 | ❌ 85vh | ❌ missing | ❌ No useKeyboardHeight | ❌ | 🔨 Rebuild — wrong height unit, no sticky header, no keyboard handling, no p-0, wrong flex structure. |
| 8 | ReceiptDetailsSheet | ❌ | ❌ Radix default | ❌ SheetHeader wrapper, no close btn | ❌ Missing shrink-0 | ❌ 75vh | ❌ missing | N/A (read-only) | ❌ | 🔧 Moderate — fix vh→dvh, add shrink-0, add hideClose, add close btn, add rounded-t-2xl, add overscroll-contain. |
| 9 | QuickGroupMembersSheet | ❌ | ❌ Radix default | ❌ Title only, no close btn | ✅ | ✅ | ❌ missing | N/A (read-only) | ✅ | 🔧 Minor — add hideClose, add close btn + spacer, add overscroll-contain. |
| 10 | QuickScanContextSheet | ❌ | ❌ Radix default | ❌ Title only, no close btn | ✅ | ✅ | ❌ missing | N/A (read-only) | ✅ | 🔧 Minor — add hideClose, add close btn + spacer, add overscroll-contain. |
| 11 | DayDetailSheet | ❌ | ❌ Radix default | ❌ Uses SheetHeader (not sticky) | ❌ No shrink-0 | ❌ 70vh | ❌ overflow-y-auto on SheetContent | N/A (read-only) | ❌ | 🔨 Rebuild — wrong height, no flex structure, header scrolls with content, overflow on wrong element. |

### Summary

- **Total bottom sheets audited:** 11
- **✅ Fully correct:** 0 (every sheet has at least hideClose + close button gaps)
- **🔧 Minor fix (close btn + hideClose + overscroll-contain):** 6 (#1, #3, #4, #6, #9, #10)
- **🔧 Moderate fix (above + structural header refactor):** 2 (#2, #5, #8)
- **🔨 Full rebuild (broken structure):** 2 (#7 ReceiptCaptureSheet, #11 DayDetailSheet)
- **Desktop dialogs:** 20+ — all OK, no changes needed

### Most critical failures (from screenshot evidence)

1. **ReceiptCaptureSheet (#7):** `85vh` + no sticky header + no keyboard handling = header shifts off screen, keyboard obscures content
2. **DayDetailSheet (#11):** `70vh` + `overflow-y-auto` on entire SheetContent = header scrolls away with content
3. **QuickSettlementSheet (#2):** `ArrowLeft` embedded in SheetTitle text competes with Radix absolute X — confusing dual-dismiss
4. **QuickScanCreateFlow (#5):** Two separate X buttons (one custom left, one Radix right) — user doesn't know which to tap
5. **All 11 sheets:** Radix default absolute X floats over content — not part of flex layout, inconsistent appearance

---

## 4. AppSheet Component (location + status)

**File:** `src/components/ui/AppSheet.tsx`
**Status:** Created ✅ — type-check passes

### Interface

```tsx
interface AppSheetProps {
  open: boolean
  onClose: () => void
  title: string
  height?: '92dvh' | '75dvh'      // default: 92dvh
  footer?: ReactNode               // sticky CTA area
  onBack?: () => void              // renders ← if provided
  hasInputs?: boolean              // enables useKeyboardHeight (default: false)
  children: ReactNode
  headerExtra?: ReactNode          // content after title row in sticky header (e.g. progress bar)
  preventOutsideClose?: boolean    // block overlay click during submission
}
```

### Key design decisions

- `hasInputs` conditionally calls `useKeyboardHeight()` — read-only sheets skip the hook entirely
- `headerExtra` renders inside the sticky header below the title row (shrink-0) — used by MobileWizard for progress bar
- `SheetButton` internal component enforces identical close/back button appearance
- `hideClose` always passed to suppress Radix default absolute X
- `onClose` wrapped through `onOpenChange` so swipe-to-dismiss also triggers the handler

---

## 5. Fix Log (one row per sheet: what was wrong, what changed, status)

| # | Component | Issues | Fix applied | Status |
|---|-----------|--------|-------------|--------|
| 1 | MobileWizard | No hideClose, Radix default X, no close btn in header, no overscroll-contain, gap-0 class | Added hideClose, added standard ✕ close + spacer in header, progress bar in headerExtra area, added overscroll-contain, removed gap-0 | ✅ Done |
| 2 | QuickSettlementSheet | No hideClose, ArrowLeft inside SheetTitle text, Radix default X | Added hideClose, refactored to 3-slot header (← back when form view, spacer when suggestions, ✕ always right), added overscroll-contain | ✅ Done |
| 3 | QuickCreateSheet | No hideClose, no close btn, no overscroll-contain | Added hideClose, added standard ✕ close + spacer, added overscroll-contain | ✅ Done |
| 4 | QuickParticipantSetupSheet | No hideClose, no close btn, no overscroll-contain, Done button in scroll area | Added hideClose, added standard ✕ close + spacer, moved Done to sticky footer, description in header below title, added overscroll-contain | ✅ Done |
| 5 | QuickScanCreateFlow | TWO X buttons (custom left + Radix right), wrong close btn style, no overscroll-contain, Done button in header | Added hideClose, removed left X + Radix X, added standard ✕ close on right + spacer on left, moved Done to sticky footer, added overscroll-contain | ✅ Done |
| 6 | ReceiptReviewSheet | No hideClose, no close btn, no rounded-t-2xl, footer uses inline flexShrink style, no overscroll-contain | Added hideClose, added standard ✕ close + spacer, added rounded-t-2xl, changed footer to shrink-0 class + bg-background, added overscroll-contain | ✅ Done |
| 7 | ReceiptCaptureSheet | 85vh (not dvh), SheetHeader (no sticky), no p-0, no rounded-t-2xl, no hideClose, no useKeyboardHeight, no overscroll-contain | **FULL REBUILD**: 92dvh, hideClose, p-0 rounded-t-2xl, standard 3-slot header with ✕, flex flex-col structure, overscroll-contain, removed SheetHeader | ✅ Done |
| 8 | ReceiptDetailsSheet | 75vh (not dvh), no shrink-0 on header, SheetHeader wrapper, no close btn, no rounded-t-2xl, no overscroll-contain | Fixed to 75dvh via style prop, added shrink-0 + 3-slot header, added standard ✕ close, added rounded-t-2xl, removed SheetHeader, added overscroll-contain | ✅ Done |
| 9 | QuickGroupMembersSheet | No hideClose, no close btn, no overscroll-contain | Added hideClose, added standard ✕ close + spacer, added overscroll-contain | ✅ Done |
| 10 | QuickScanContextSheet | No hideClose, no close btn, no overscroll-contain | Added hideClose, added standard ✕ close + spacer, subtitle moved below title row in header, added overscroll-contain | ✅ Done |
| 11 | DayDetailSheet | 70vh (not dvh), overflow-y-auto on SheetContent, SheetHeader (not sticky), no flex structure, no p-0, no rounded-t-2xl, no hideClose | **FULL REBUILD**: 75dvh (read-only), hideClose, p-0 rounded-t-2xl, flex flex-col, standard 3-slot header with ✕, badges in header below title, content only scrolls, overscroll-contain, removed SheetHeader/SheetDescription | ✅ Done |

### Post-audit fixes

| # | Component | Issue | Fix applied | Status |
|---|-----------|-------|-------------|--------|
| 12 | MobileWizard (ExpenseWizard.tsx) | iOS Safari: numpad keyboard causes `visualViewport.offsetTop > 0`, pushing sheet header above visible viewport — ✕ close button disappears on first numpad open | Added `viewportOffset` to `useKeyboardHeight` hook (tracks `visualViewport.offsetTop`). **v1 (PR #376):** subtracted offset from height. **v2 (PR #380):** bottom-based with viewportOffset. **v3 (PR #409):** switched to top-based positioning (`top: viewportOffset`, `bottom: 'auto'`, `height: availableHeight`). All 6 sheets with keyboard handling now use the same top-based pattern. | ✅ Done (PR #409, all sheets PR #653) |

### Test results

- `npm run type-check`: ✅ Pass (zero errors)
- `npm test`: ✅ Pass (20 test files, 140 tests passed)

---

## 6. Verification Results (Playwright screenshots + PASS/FAIL)

**Environment:** localhost:5173, Chrome (Playwright MCP), 375×812 mobile viewport
**Trip used:** Himos 2025 (`himos-2025-mfXvoX`) — unauthenticated access via shared link

### Verified sheets

| # | Sheet | Screenshot | Header visible? | Close btn standard? | No bleed-through? | Verdict |
|---|-------|-----------|----------------|--------------------|--------------------|---------|
| 1 | MobileWizard (Add Expense) | `01-mobile-wizard-open.png` | ✅ Spacer + "Add Expense" + ✕ | ✅ rounded-full w-8 h-8 border | ✅ | **PASS** |
| 1b | MobileWizard (input focused) | `01b-mobile-wizard-input-focused.png` | ✅ Header stays pinned | ✅ | ✅ | **PASS** |
| 2 | QuickSettlementSheet (suggestions) | `02-settlement-open.png` | ✅ Spacer + "Settle up" + ✕ | ✅ | ✅ | **PASS** |
| 2c | QuickSettlementSheet (form view) | `02c-settlement-form-view.png` | ✅ ← back + "Record payment" + ✕ | ✅ Both back + close are standard | ✅ | **PASS** |
| 4 | QuickScanContextSheet | `04-scan-context-open.png` | ✅ Spacer + icon + "Scan a Receipt" + ✕ | ✅ | ✅ 75dvh read-only | **PASS** |
| 5 | DayDetailSheet (**full rebuild**) | `05-day-detail-open.png` | ✅ Spacer + "Monday, Dec 29" + ✕ + badges | ✅ | ✅ 75dvh read-only | **PASS** |
| 6 | ReceiptCaptureSheet (**full rebuild**) | `06-receipt-capture-open.png` | ✅ Spacer + icon + "Scan Receipt" + ✕ | ✅ | ✅ 92dvh | **PASS** |

### Close button uniformity

| Sheet | Screenshot | Identical? |
|-------|-----------|-----------|
| MobileWizard | `01c-mobile-wizard-close-btn.png` | ✅ |
| QuickSettlementSheet | `02b-settlement-close-btn.png` | ✅ |
| DayDetailSheet | `05b-day-detail-close-btn.png` | ✅ |

All three close button close-ups are visually identical: rounded circle, thin border, centered X icon in muted-foreground.

### Not verified (require auth or existing data)

| # | Sheet | Reason | Risk |
|---|-------|--------|------|
| 3 | QuickCreateSheet | Requires auth to create trips | Low — minor fix (hideClose + close btn + overscroll-contain) |
| 4 | QuickParticipantSetupSheet | Requires auth for setup flow | Low — minor fix |
| 5 | QuickScanCreateFlow | Requires auth for new group creation | Low — moderate fix (header refactor), but same pattern verified on Settlement form view |
| 6 | ReceiptReviewSheet | Requires receipt scan data | Low — minor fix |
| 8 | ReceiptDetailsSheet | Requires receipt data | Low — moderate fix (vh→dvh, shrink-0), but same pattern verified on DayDetailSheet |
| 9 | QuickGroupMembersSheet | Requires expenses/balances | Low — minor fix |

### Summary

- **7 sheet states verified** across 5 distinct sheets (including both full rebuilds)
- **3 close button close-ups** confirmed visually identical
- **0 failures** — all checked sheets match the standard
- **6 sheets not verifiable** without auth — all minor/moderate fixes sharing patterns already verified
- **Keyboard behavior** (useKeyboardHeight): not testable on desktop Chrome — iOS-specific; structural fixes (dvh, flex, shrink-0) verified
- **viewportOffset fix (PR #373)**: MobileWizard tested with Playwright (375×812) — ✕ button visible in all 4 keyboard states (no keyboard, description focus, amount focus, second amount focus). True iOS numpad behavior not reproducible in desktop Chromium; structural correctness confirmed

---

## 7. Regression Prevention (CLAUDE.md + PLAN.md updates done)

### CLAUDE.md updates
1. Added **"Bottom Sheet Standard"** section after Expense Wizard — documents required structure, close button markup, height values, dismiss rules, links to SHEET_AUDIT.md
2. Fixed outdated `90vh` references → `92dvh` in Expense Wizard and iOS Keyboard sections
3. Added 3 new entries to **Common Pitfalls** table: sheet header scrolls away, two X buttons, wrong height unit

### PLAN.md updates
1. Added session log entry for sheet/dialog audit

### Memory updates
1. Updated `memory/MEMORY.md` sheet pattern section (reflects AppSheet + all 11 sheets fixed)

---

## 8. Open Issues (anything found but out of scope for this PR)

### 8.1 — Other sheets missing `viewportOffset` adjustment

✅ **All 6 sheets migrated to top-based keyboard positioning** (`top: viewportOffset`, `bottom: 'auto'`, `height: availableHeight`) in PR #653:

- `AppSheet` (`src/components/ui/AppSheet.tsx`)
- `ReceiptReviewSheet` (`src/components/receipts/ReceiptReviewSheet.tsx`)
- `QuickSettlementSheet` (`src/components/quick/QuickSettlementSheet.tsx`)
- `QuickCreateSheet` (`src/components/quick/QuickCreateSheet.tsx`)
- `QuickParticipantSetupSheet` (`src/components/quick/QuickParticipantSetupSheet.tsx`)
- `QuickScanCreateFlow` (`src/components/quick/QuickScanCreateFlow.tsx`)

Also added `pwa-safe-bottom` to AppSheet footer and standardized all dialog `max-h` to `85vh`.
