# Card, Sheet & Dialog Standard

> Canonical rules for every sheet, dialog, card, and wizard in Spl1t.
> Last audited: 2026-03-08

---

## 1. Decision Tree — What Component to Use

```
Is this an overlay that blocks interaction with the page?
├── YES → Is it a delete / destructive confirmation?
│   └── YES → AlertDialog (same on all viewports, no Sheet needed)
├── YES → Is it a multi-step wizard with step navigation?
│   └── YES → Raw Sheet + Dialog (see ExpenseWizard / QuickScanCreateFlow)
├── YES → Any other overlay (form, picker, detail view)?
│   └── YES → ResponsiveOverlay (hasInputs=true for forms, false for read-only)
└── NO → Inline card or section (not covered here)
```

**Rules:**
- **Default choice: `ResponsiveOverlay`** (`src/components/ui/ResponsiveOverlay.tsx`). It renders `AppSheet` on mobile (< 768px) and `Dialog` on desktop, handling breakpoint detection, keyboard, and iOS scroll fixes internally.
- Detection: `useMediaQuery('(max-width: 767px)')` — never `window.innerWidth`, never `768px`.
- **Delete confirmations:** `AlertDialog` (small, centered, same on all viewports). The one exception to the Sheet-on-mobile rule — they're short enough that centering is fine.
- **Multi-step wizards:** Use raw `Sheet` + `Dialog` directly (see §4). Only `ExpenseWizard` and `QuickScanCreateFlow` need this.
- **Never** use raw `Sheet`/`Dialog` for simple single-screen overlays — use `ResponsiveOverlay` instead.

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

## 3c. ResponsiveOverlay — Standard Wrapper (preferred)

**Use `ResponsiveOverlay` for every new overlay.** It renders `AppSheet` on mobile and `Dialog` on desktop, sharing the same header structure. You don't need to manage breakpoint detection, keyboard, or iOS scroll fixes manually.

```tsx
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'

function MyOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      title="Title"
      hasInputs           // true → 92dvh + keyboard hooks (mobile); false → 75dvh (default)
      maxWidth="max-w-lg"  // desktop Dialog max-width (default: 'max-w-lg')
      footer={<Button>Save</Button>}  // optional sticky footer
    >
      {/* content */}
    </ResponsiveOverlay>
  )
}
```

**Props reference:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controls visibility |
| `onClose` | `() => void` | — | Called on close (both mobile swipe and desktop overlay click) |
| `title` | `ReactNode` | — | Shown in sticky header center slot |
| `hasInputs` | `boolean` | `false` | `true` → 92dvh + keyboard handling; `false` → 75dvh read-only |
| `maxWidth` | `string` | `'max-w-lg'` | Desktop dialog max-width class |
| `footer` | `ReactNode` | — | Sticky footer below scroll area |
| `onBack` | `() => void` | — | Shows ← back arrow in left slot |
| `headerExtra` | `ReactNode` | — | Content below title row (e.g. description, progress bar) |
| `preventOutsideClose` | `boolean` | `false` | Block overlay click during submission |
| `scrollRef` | `RefObject<HTMLDivElement>` | — | External scroll ref (e.g. for `useScrollIntoView`) |
| `scrollClassName` | `string` | `'px-4 py-4'` | Override scroll container className |

---

## 3d. AlertDialog — Delete / Destructive Confirmations

**All delete confirmations MUST use `AlertDialog`, not `Dialog` or `ResponsiveOverlay`.** AlertDialog prevents closing by clicking outside (user must explicitly cancel or confirm), which is the correct UX for destructive actions.

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

<AlertDialog open={showDelete} onOpenChange={setShowDelete}>
  <AlertDialogContent className="max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Item?</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Key differences from Dialog:**
- `AlertDialogCancel` auto-closes (no need for manual `onClick`)
- `AlertDialogAction` styled as primary by default — override with destructive classes
- No outside-click dismiss (safe for destructive actions)
- Same on all viewports (small centered modal)

---

## 3e. Documented Exceptions (raw Sheet/Dialog)

Two components intentionally bypass `ResponsiveOverlay` and manage their own `Sheet`/`Dialog` rendering:

1. **`ExpenseWizard`** (`src/components/expenses/ExpenseWizard.tsx`) — Multi-step wizard with step navigation, custom progress bar, and separate MobileWizard/MobileEditSheet/Desktop paths.
2. **`QuickScanCreateFlow`** (`src/components/quick/QuickScanCreateFlow.tsx`) — 3-step flow (camera → scanning → participants) with trip creation mid-flow and close-prevention during scanning.

These are the only components that should use raw `Sheet`/`Dialog`. All other overlays should use `ResponsiveOverlay`.

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

## Appendix A — Existing Component Audit (2026-03-08, updated 2026-03-08 post-PR #661)

### Audit Table

**Legend:** RO = `ResponsiveOverlay`, Raw = raw Sheet+Dialog, AD = AlertDialog

| Component | File | Wrapper | Notes |
|-----------|------|---------|-------|
| **ResponsiveOverlay consumers (25)** | | | |
| SettlementsPage form | pages/SettlementsPage.tsx | RO | hasInputs, keyboard ✅ |
| QuickSettlementSheet | quick/QuickSettlementSheet.tsx | RO | hasInputs, keyboard ✅ |
| QuickCreateSheet | quick/QuickCreateSheet.tsx | RO | hasInputs, keyboard ✅ |
| QuickParticipantSetupSheet | quick/QuickParticipantSetupSheet.tsx | RO | hasInputs, keyboard ✅ |
| ReceiptReviewSheet | receipts/ReceiptReviewSheet.tsx | RO | hasInputs, keyboard ✅ |
| ReceiptCaptureSheet | receipts/ReceiptCaptureSheet.tsx | RO | no inputs |
| ReceiptDetailsSheet | receipts/ReceiptDetailsSheet.tsx | RO | read-only 75dvh |
| QuickHistorySheet | quick/QuickHistorySheet.tsx | RO | read-only 75dvh |
| QuickScanContextSheet | quick/QuickScanContextSheet.tsx | RO | read-only 75dvh |
| QuickGroupMembersSheet | quick/QuickGroupMembersSheet.tsx | RO | read-only 75dvh |
| DayDetailSheet | DayDetailSheet.tsx | RO | read-only 75dvh |
| ReportIssueDialog | ReportIssueDialog.tsx | RO | hasInputs, keyboard ✅ |
| ShareTripDialog | ShareTripDialog.tsx | RO | no inputs |
| LinkParticipantDialog | LinkParticipantDialog.tsx | RO | hasInputs |
| BankDetailsDialog | auth/BankDetailsDialog.tsx | RO | hasInputs |
| MealCard edit | MealCard.tsx | RO | hasInputs |
| ActivityCard edit | ActivityCard.tsx | RO | hasInputs |
| StayCard edit | StayCard.tsx | RO | hasInputs |
| ShoppingItemCard edit | ShoppingItemCard.tsx | RO | hasInputs |
| ShoppingItemRow edit | ShoppingItemRow.tsx | RO | hasInputs |
| ManageTripPage edit | pages/ManageTripPage.tsx | RO | hasInputs |
| ShoppingPage add | pages/ShoppingPage.tsx | RO | hasInputs |
| MealGrid add | MealGrid.tsx | RO | hasInputs |
| TimeSlotGrid add | TimeSlotGrid.tsx | RO | hasInputs |
| CostBreakdownDialog | CostBreakdownDialog.tsx | RO | read-only |
| **Raw Sheet+Dialog (2 exceptions)** | | | |
| ExpenseWizard | expenses/ExpenseWizard.tsx | Raw | Multi-step wizard, custom progress bar |
| QuickScanCreateFlow | quick/QuickScanCreateFlow.tsx | Raw | 3-step flow with trip creation mid-flow |
| **AlertDialog (delete confirmations)** | | | |
| ExpensesPage delete | pages/ExpensesPage.tsx | AD | — |
| SettlementsPage delete | pages/SettlementsPage.tsx | AD | — |
| ManageTripPage delete | pages/ManageTripPage.tsx | AD | — |
| MealCard delete | MealCard.tsx | AD | — |
| ActivityCard delete | ActivityCard.tsx | AD | — |
| StayCard delete | StayCard.tsx | AD | — |
| ShoppingItemCard delete | ShoppingItemCard.tsx | AD | — |
| ShoppingItemRow delete | ShoppingItemRow.tsx | AD | — |
| GroupActions delete | quick/GroupActions.tsx | AD | — |

### Issue History (all resolved)

All P1–P3 issues from the original audit are resolved. See git history for PRs #653, #656, #658, #659, #661.
