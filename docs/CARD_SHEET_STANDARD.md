# Card, Sheet & Dialog Standard

> Canonical rules for every sheet, dialog, card, and wizard in Spl1t.
> Last audited: 2026-03-08

---

## 1. Decision Tree — What Component to Use

```
Is this an overlay that blocks interaction with the page?
├── YES → Does it contain form inputs or require keyboard?
│   ├── YES → Is the user on mobile (< 768px)?
│   │   ├── YES → Bottom Sheet (92dvh, keyboard-aware)
│   │   └── NO  → Centered Dialog (max-h-[85vh], flex column)
│   └── NO  → Is it a read-only detail view or picker?
│       ├── YES → Is the user on mobile (< 768px)?
│       │   ├── YES → Bottom Sheet (75dvh, no keyboard hook)
│       │   └── NO  → Centered Dialog (max-h-[85vh])
│       └── NO  → Small confirmation / action?
│           └── YES → AlertDialog (same on all viewports)
└── NO → Inline card or section (not covered here)
```

**Rules:**
- Every overlay that appears on mobile MUST be a bottom Sheet. No centered dialogs on phones.
- Every overlay that appears on desktop MUST be a centered Dialog. No bottom sheets on desktop.
- Detection: `useMediaQuery('(max-width: 767px)')` — never `window.innerWidth`.
- Multi-step wizards: Sheet on mobile (MobileWizard pattern), Dialog on desktop.
- Delete confirmations: AlertDialog (small, centered, same on all viewports). These are the one exception to the Sheet-on-mobile rule — they're short enough that centering is fine.
- The **same content JSX** should be extracted into a variable and rendered inside both Sheet and Dialog to avoid duplication.

---

## 2. Mobile Sheet Template

```tsx
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { X } from 'lucide-react'

function MySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const keyboard = useKeyboardHeight()     // omit for read-only sheets
  const scrollRef = useIOSScrollFix()

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
          ...(keyboard.isVisible && {
            top: `${keyboard.viewportOffset}px`,
            bottom: 'auto',
          }),
        }}
      >
        {/* STICKY HEADER — shrink-0, never scrolls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />  {/* spacer — or ArrowLeft back button */}
          <SheetTitle className="text-base font-semibold">Title</SheetTitle>
          <button onClick={onClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center
                       border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* SCROLLABLE BODY — only this scrolls */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {/* content */}
        </div>

        {/* STICKY FOOTER — shrink-0, never scrolls */}
        <div className="shrink-0 px-4 py-3 border-t border-border bg-background pwa-safe-bottom">
          {/* CTA buttons */}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

### Height values

| Sheet type | Height | Keyboard hook |
|-----------|--------|---------------|
| Input / form / wizard | `92dvh` → `availableHeight px` when keyboard open | `useKeyboardHeight()` required |
| Read-only / picker / history | `75dvh` fixed | None |

**Never** use `vh`. **Never** use `h-screen`. **Never** use fixed `px` heights. Always `dvh`.

### Corner radius
- Top corners: `rounded-t-2xl` (16px)
- Bottom corners: square (sheet is edge-to-edge at bottom)

### Close button — identical everywhere, no exceptions
```tsx
<button onClick={onClose} aria-label="Close"
  className="rounded-full w-8 h-8 flex items-center justify-center
             border border-border hover:bg-muted transition-colors">
  <X className="w-4 h-4 text-muted-foreground" />
</button>
```

### Dismiss rules
- Single-screen sheets: ✕ close only. Left slot = `<div className="w-8" />` spacer.
- Multi-step sheets: ← back (left) + ✕ close (right). Step 1: spacer instead of back.
- **Never** show two buttons that both close the sheet.

### Keyboard positioning (iOS)
- **Always** use top-based positioning when keyboard is visible:
  - `top: viewportOffset` — anchors to visible area
  - `bottom: 'auto'` — overrides CSS `bottom: 0`
  - `height: availableHeight` — fills to keyboard
- **Never** compute `bottom` from `window.innerHeight` (unreliable on iOS Safari)
- **Never** use `autoFocus` or `ref.focus()` on inputs inside sheets
- `paddingBottom: viewportOffset` when `viewportOffset > 0` — keeps content above keyboard overlap

### iOS scroll fix
- Every scroll container inside a sheet MUST use `ref={scrollRef}` from `useIOSScrollFix()`
- Prevents iOS Safari scroll lock at boundaries

### PWA safe area
- Every sheet footer MUST have `pwa-safe-bottom` class for iPhone home indicator padding

---

## 3. Desktop Dialog Template

### 3a. Dual-mode dialog (has Sheet counterpart on mobile)

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { X } from 'lucide-react'

function MyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scrollRef = useIOSScrollFix()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent hideClose className="flex flex-col max-h-[85vh] max-w-lg p-0 gap-0">
        {/* STICKY HEADER — same 3-slot layout as sheet */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <DialogTitle className="text-base font-semibold">Title</DialogTitle>
          <button onClick={onClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center
                       border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {/* content */}
        </div>

        {/* STICKY FOOTER */}
        <div className="shrink-0 px-4 py-3 border-t border-border">
          {/* CTA buttons */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Key classes on `DialogContent`:**
- `hideClose` — suppresses Radix default close button (we use custom)
- `flex flex-col` — enables sticky header/footer via flex
- `max-h-[85vh]` — prevents dialog from exceeding viewport
- `p-0 gap-0` — removes default padding (we apply our own per-section)

### 3b. Dialog-only component (no Sheet counterpart)

For simple dialogs that are small enough to work on all viewports (confirmations, small forms, share dialogs):

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Subtitle</DialogDescription>
    </DialogHeader>
    {/* form content */}
    <DialogFooter>
      {/* buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Key differences from dual-mode:**
- No `hideClose` — uses Radix default close button (acceptable for simple dialogs)
- `overflow-y-auto` on `DialogContent` directly (header scrolls with content — OK for short content)
- Standard `DialogHeader`/`DialogFooter` layout
- `max-h-[85vh]` (standardized across all dialogs)

### Max-width reference

| Content type | Max-width |
|-------------|-----------|
| Simple form / picker / confirmation | `max-w-lg` (512px) |
| Delete confirmation | `max-w-sm` (384px) |
| Complex form (expense wizard) | `max-w-2xl` (672px) |
| Wide content (receipt review) | `max-w-2xl` (672px) |

### Corner radius
- All corners: `sm:rounded-lg` (applied by default in `dialog.tsx`)

---

## 4. MobileWizard Rules

The MobileWizard (in `ExpenseWizard.tsx`) is a special multi-step sheet pattern.

### Structure
- Same sheet structure as §2 (sticky header, scrollable body, sticky footer)
- Progress bar in `headerExtra` slot (between header and scroll container)
- Step indicator dots + step title below progress bar

### Navigation
- Step 1: spacer (left) + ✕ close (right)
- Steps 2+: ← back (left) + ✕ close (right)
- Back goes to previous step, close dismisses entirely

### Form reset timing
- Form state resets **300ms after `open` becomes `false`** — lets close animation complete
- Uses `isMounted` ref guard to prevent state updates on unmounted component

### Keyboard handling
- Uses top-based positioning (§2 pattern)
- `viewportOffset` tracked for iOS numpad
- Sheet height switches from `92dvh` to `availableHeight px` when keyboard visible

### Desktop fallback
- On desktop (≥ 768px) or in edit mode: renders `ExpenseForm` in a `Dialog` instead
- `stickyFooter` prop on `ExpenseForm` enables flex column layout with sticky footer

---

## 5. Animation Spec

### Sheet animations (from `sheet.tsx`)

| Event | Animation | Duration | Easing |
|-------|-----------|----------|--------|
| Open | `slide-in-from-bottom` + overlay `fade-in` | 500ms | `ease-in-out` |
| Close | `slide-out-to-bottom` + overlay `fade-out` | 300ms | `ease-in-out` |

### Dialog animations (from `dialog.tsx`)

| Event | Animation | Duration | Easing |
|-------|-----------|----------|--------|
| Open | `fade-in` + `zoom-in-95` + `slide-in-from-top-[48%]` | 200ms | default |
| Close | `fade-out` + `zoom-out-95` + `slide-out-to-top-[48%]` | 200ms | default |

### MobileWizard form reset
- 300ms delay after `open → false` before state reset

### Reduced motion
- `prefers-reduced-motion: reduce` → all animation durations set to 0.01ms (in `index.css`)

---

## 6. Z-Index Hierarchy

| Layer | Z-Index | Components |
|-------|---------|------------|
| Stale session overlay | `z-[200]` | `StaleSessionOverlay` |
| Toast | `z-[100]` | Toast viewport |
| Sheets & Dialogs | `z-50` | All Sheet/Dialog overlays + content |
| Fixed header | `z-50` | `Layout`, `QuickLayout` headers |
| Bottom nav | `z-40` | Layout bottom tab bar |
| Dropdowns / selects | `z-50` | Radix popover content |

**Note:** Header and sheets share `z-50`. Sheets render above headers due to DOM order (portal at end of body). No conflicts observed.

---

## 7. iOS Keyboard Rules

### Banned patterns
- `position: fixed; bottom: 0` when keyboard is open — sheet hides behind keyboard
- Computing `bottom` from `window.innerHeight` — unreliable on iOS Safari
- `autoFocus` or `ref.focus()` in `useEffect` inside sheets — triggers keyboard on open
- `vh` units for sheet height — doesn't recalculate when keyboard opens

### Required patterns
- Top-based positioning when keyboard visible: `top: viewportOffset`, `bottom: 'auto'`
- `useKeyboardHeight()` hook for all sheets with inputs
- `useIOSScrollFix()` on every scroll container inside sheets
- `dvh` units for sheet heights
- `inputMode="decimal"` + `replace(',', '.')` for amount inputs (European iOS locales)

### Keyboard detection
- `useKeyboardHeight` uses `window.visualViewport` API
- Keyboard open when `window.innerHeight - visualViewport.height > 150px`
- `viewportOffset = visualViewport.offsetTop` (non-zero when iOS scrolls viewport for numpad)

---

## 8. PR Review Checklist

Copy-paste this into PR reviews for any new or modified sheet/dialog:

```markdown
### Sheet/Dialog Checklist

**Type & breakpoint:**
- [ ] Mobile (< 768px) renders as bottom Sheet
- [ ] Desktop (≥ 768px) renders as centered Dialog
- [ ] Detection uses `useMediaQuery('(max-width: 767px)')` hook
- [ ] Content JSX shared between Sheet and Dialog (no duplication)

**Sheet structure:**
- [ ] `side="bottom"` on SheetContent
- [ ] `hideClose` on SheetContent
- [ ] `className="flex flex-col p-0 rounded-t-2xl"` on SheetContent
- [ ] Header: `shrink-0`, 3-slot layout (back/spacer | title | close)
- [ ] Body: `flex-1 overflow-y-auto overscroll-contain`
- [ ] Footer (if present): `shrink-0`, `pwa-safe-bottom`
- [ ] No `overflow-y-auto` on SheetContent itself

**Dialog structure:**
- [ ] `hideClose` if using custom close button
- [ ] `max-h-[85vh]` (all dialogs)
- [ ] `flex flex-col p-0 gap-0` if using sticky header/footer
- [ ] `sm:rounded-lg` (default from dialog.tsx)

**Height:**
- [ ] Input sheets: `92dvh` (keyboard: `availableHeight px`)
- [ ] Read-only sheets: `75dvh` fixed
- [ ] No `vh`, no `h-screen`, no fixed `px`

**iOS keyboard (input sheets only):**
- [ ] `useKeyboardHeight()` hook present
- [ ] Top-based positioning: `top: viewportOffset`, `bottom: 'auto'`
- [ ] No `autoFocus` or `ref.focus()` in useEffect
- [ ] `inputMode="decimal"` on amount inputs

**iOS scroll:**
- [ ] `useIOSScrollFix()` ref on scroll container
- [ ] `overscroll-contain` on scroll container

**Close button:**
- [ ] Custom close button matches standard (rounded-full w-8 h-8 border)
- [ ] No duplicate X (Radix default suppressed via `hideClose`)
- [ ] Single-screen: ✕ only, left slot = spacer
- [ ] Multi-step: ← back + ✕ close (step 1: spacer + ✕)

**Animation:**
- [ ] Sheet: slide-in-from-bottom (no custom overrides needed)
- [ ] Dialog: fade + zoom (no custom overrides needed)
- [ ] MobileWizard: 300ms delayed form reset after close

**PWA:**
- [ ] `pwa-safe-bottom` on sheet footer
- [ ] `pwa-safe-bottom` on bottom nav interactions
```

---

## Appendix A — Existing Component Audit (2026-03-08)

### Audit Table

| Component | File | Opens as | Dual mode | Height | hideClose | Header shrink-0 | IOSScrollFix | pwa-safe-bottom | Keyboard pattern | Issues |
|-----------|------|----------|-----------|--------|-----------|-----------------|--------------|-----------------|------------------|--------|
| AppSheet | ui/AppSheet.tsx | Sheet | N/A (base) | 92/75dvh | ✅ | ✅ | ✅ | ✅ footer | **top-based** ✅ | — |
| MobileWizard | expenses/ExpenseWizard.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | — |
| SettlementsPage | pages/SettlementsPage.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | — |
| QuickSettlementSheet | quick/QuickSettlementSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | — |
| QuickCreateSheet | quick/QuickCreateSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ❌ | **top-based** ✅ | — |
| QuickScanCreateFlow | quick/QuickScanCreateFlow.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | — |
| QuickParticipantSetupSheet | quick/QuickParticipantSetupSheet.tsx | Sheet only | ❌ | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | P3: no desktop |
| ReceiptReviewSheet | receipts/ReceiptReviewSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ✅ | **top-based** ✅ | — |
| ReceiptCaptureSheet | receipts/ReceiptCaptureSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 92dvh | ✅ | ✅ | ✅ | ❌ | N/A (no inputs) | P3: no pwa-safe |
| ReceiptDetailsSheet | receipts/ReceiptDetailsSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 75dvh | ✅ | ✅ | ✅ | ✅ | N/A (read-only) | — |
| QuickHistorySheet | quick/QuickHistorySheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 75dvh | ✅ | ✅ | ✅ | ❌ | N/A (read-only) | P3: no pwa-safe |
| QuickScanContextSheet | quick/QuickScanContextSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 75dvh | ✅ | ✅ | ✅ | ❌ | N/A (read-only) | P3: no pwa-safe |
| QuickGroupMembersSheet | quick/QuickGroupMembersSheet.tsx | Sheet only | ❌ | 75dvh | ✅ | ✅ | ✅ | ❌ | N/A (read-only) | P3: no desktop, no pwa-safe |
| DayDetailSheet | DayDetailSheet.tsx | Sheet+Dialog | ✅ useMediaQuery | 75dvh | ✅ | ✅ | ✅ | ❌ | N/A (read-only) | P3: no pwa-safe |
| CostBreakdownDialog | CostBreakdownDialog.tsx | Dialog only | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile, no IOSScrollFix |
| ReportIssueDialog | ReportIssueDialog.tsx | Dialog only | ❌ | dynamic (keyboard) | ❌ | ✅ | ❌ | ❌ | transform-based | P2: non-standard keyboard handling, P3: no sheet on mobile |
| ShareTripDialog | ShareTripDialog.tsx | Dialog only | ❌ | default | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| LinkParticipantDialog | LinkParticipantDialog.tsx | Dialog only | ❌ | default | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| BankDetailsDialog | auth/BankDetailsDialog.tsx | Dialog only | ❌ | default | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| ManageTripPage edit | pages/ManageTripPage.tsx | Dialog only | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| ShoppingPage add | pages/ShoppingPage.tsx | Dialog only | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| ExpensesPage delete | pages/ExpensesPage.tsx | AlertDialog | N/A | default | ❌ | ✅ | ❌ | ❌ | N/A | — (correct for confirmation) |
| ActivityCard edit/delete | ActivityCard.tsx | Dialog/AlertDialog | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| MealCard edit/delete | MealCard.tsx | Dialog/AlertDialog | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| MealGrid add | MealGrid.tsx | Dialog only | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| TimeSlotGrid add | TimeSlotGrid.tsx | Dialog only | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| ShoppingItemCard edit/delete | ShoppingItemCard.tsx | Dialog/AlertDialog | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| ShoppingItemRow edit/delete | ShoppingItemRow.tsx | Dialog/AlertDialog | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |
| StayCard edit/delete | StayCard.tsx | Dialog/AlertDialog | ❌ | max-h-[85vh] | ❌ | ✅ | ❌ | ❌ | N/A | P3: no sheet on mobile |

### Prioritised Issue List

#### P1 — Broken on device (keyboard positioning)

1–6. ✅ **All 6 sheets migrated to top-based keyboard positioning** (`top: viewportOffset`, `bottom: 'auto'`, `height: availableHeight`) — PR #653
   - AppSheet, QuickSettlementSheet, QuickCreateSheet, QuickScanCreateFlow, ReceiptReviewSheet, QuickParticipantSetupSheet

#### P2 — Visual bug

7. **ReportIssueDialog uses non-standard keyboard handling** — `transform: translateY(-)` to shift dialog up instead of top-based positioning. Works but is inconsistent with sheet pattern and may interact poorly with iOS Safari viewport scrolling.
   - File: `src/components/ReportIssueDialog.tsx:188-192`
   - Fix: For dialogs this is acceptable (centered, not bottom-anchored). Document as exception.

#### P3 — Inconsistency (not visibly broken)

8. ✅ **AppSheet footer** now has `pwa-safe-bottom` (cascades to all AppSheet consumers) — PR #653
   - Remaining: QuickCreateSheet, QuickHistorySheet, QuickScanContextSheet, ReceiptCaptureSheet, QuickGroupMembersSheet, DayDetailSheet (no footer or not using AppSheet)

9. **Sheet-only components with no desktop Dialog:**
   - QuickParticipantSetupSheet — mobile-only component, acceptable
   - QuickGroupMembersSheet — mobile-only component, acceptable

10. **Dialog-only components with no mobile Sheet:**
    - CostBreakdownDialog, ReportIssueDialog, ShareTripDialog, LinkParticipantDialog, BankDetailsDialog
    - All planner/shopping dialogs: ActivityCard, MealCard, MealGrid, TimeSlotGrid, ShoppingItemCard, ShoppingItemRow, StayCard, ManageTripPage edit, ShoppingPage add
    - These are all short-form dialogs or simple edit forms. On mobile they render as centered Radix dialogs (not bottom sheets). They work but don't follow the Sheet-on-mobile standard.
    - **Decision needed:** Are these worth converting? Most are small enough that centered dialogs are acceptable on mobile. Priority is low — convert only if users report friction.

11. ✅ **Max-height standardized** — All dialogs now use `max-h-[85vh]` — PR #653

12. **Dialog-only components missing `useIOSScrollFix`:**
    - CostBreakdownDialog, all planner/shopping dialogs
    - Low impact since these are short-form content unlikely to hit scroll boundaries.
