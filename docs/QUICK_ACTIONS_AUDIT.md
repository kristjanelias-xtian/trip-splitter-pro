# Quick Actions Consistency Audit
> Started: 2026-02-24
> Status: COMPLETE
> Scope: The 4 quick action buttons in QuickGroupDetailPage
> Goal: Consistent bottom sheet (mobile) + centered modal
>   (desktop) experience across all 4 actions.
> Update this file continuously throughout the session.
> If context is lost, read this file to resume.

---

## 1. Current Behaviour Inventory

### Quick action buttons (QuickGroupDetailPage.tsx:178-204)

| # | Button | Component opened | Mobile behaviour | Desktop behaviour | Height | Width | Navigates away? | Keyboard: width stable? | Header stable on keyboard? |
|---|--------|-----------------|------------------|-------------------|--------|-------|-----------------|------------------------|---------------------------|
| 1 | Scan a receipt | `ReceiptCaptureSheet` | Bottom sheet (`side="bottom"`) | **Same bottom sheet** — no desktop dialog | `92dvh` (static, no keyboard hook) | `w-full` (no explicit width) | No ✅ | N/A (no text inputs) | Yes ✅ (shrink-0 header) |
| 2 | Add an expense | `QuickExpenseSheet` → `ExpenseWizard` → Mobile: `MobileWizard` (Sheet), Desktop: `ExpenseForm` (Dialog) | Bottom sheet, keyboard-aware height/bottom/paddingBottom with `viewportOffset` | Centered Dialog `max-w-2xl max-h-[90vh]` | Mobile: `92dvh` / `availableHeight` when keyboard open. Desktop: `max-h-[90vh]` | Mobile: `w-full`. Desktop: `max-w-2xl` (672px) | No ✅ | Yes ✅ | Yes ✅ (shrink-0 + viewportOffset fix) |
| 3 | Settle up | `QuickSettlementSheet` | Bottom sheet, keyboard-aware height/bottom but **missing `viewportOffset`** | **Same bottom sheet** — no desktop dialog | `92dvh` / `availableHeight` when keyboard open | `w-full` (no explicit width) | No ✅ | Yes ✅ | **Partial** — no `viewportOffset` fix, numpad can push header off screen |
| 4 | View expenses & payments | `QuickHistoryPage` (page navigation) | **Navigates away** to `/t/:tripCode/quick/history` — full page inside QuickLayout | **Navigates away** — same full page | Page height (not a sheet) | `max-w-lg mx-auto` page container | Yes ❌ | N/A | N/A |

### Per-button details

#### 1. Scan a receipt (`ReceiptCaptureSheet`)
- Uses `Sheet` + `SheetContent side="bottom"` ✅
- `hideClose` ✅
- Standard 3-slot header: spacer | title | ✕ close ✅
- `shrink-0` header with `border-b` ✅
- `flex-1 overflow-y-auto overscroll-contain` scroll area ✅
- `dvh` ✅ (not `vh`)
- No `useKeyboardHeight` — no text inputs in this sheet (file picker buttons only)
- **Desktop**: renders as bottom sheet, NOT a centered dialog ❌

#### 2. Add an expense (`ExpenseWizard` → `MobileWizard` / `Dialog`)
- Mobile: `MobileWizard` — full AppSheet standard ✅
  - `hideClose` ✅, `shrink-0` header ✅, `dvh` ✅
  - `useKeyboardHeight` with `viewportOffset` fix ✅ (best implementation)
  - Sticky footer with navigation buttons ✅
- Desktop: `Dialog` + `DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"` ✅
  - Centered modal ✅
  - But `max-w-2xl` (672px), not `max-w-lg` (512px)
  - Uses `vh` not `dvh` for `max-h` (desktop, acceptable)
  - Radix default close button (absolute positioned) — no custom close
- Breakpoint: `useMediaQuery('(max-width: 768px)')` — switches at 768px

#### 3. Settle up (`QuickSettlementSheet`)
- Uses `Sheet` + `SheetContent side="bottom"` ✅
- `hideClose` ✅
- Standard 3-slot header with back (form view) or spacer ✅
- `shrink-0` header with `border-b` ✅
- `flex-1 overflow-y-auto overscroll-contain` scroll area ✅
- `dvh` ✅
- `useKeyboardHeight` ✅ but keyboard style is:
  ```
  height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh'
  bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined
  ```
  **Missing**: `viewportOffset` subtraction from bottom, `paddingBottom` for viewportOffset
- **Desktop**: renders as bottom sheet, NOT a centered dialog ❌

#### 4. View expenses & payments (`QuickHistoryPage`)
- **Not a sheet at all** — navigates to `/t/:tripCode/quick/history`
- Renders as full page inside `QuickLayout`
- Has its own filter tabs (All / Expenses / Payments)
- Read-only content (no keyboard interactions)
- **Biggest deviation**: leaves `QuickGroupDetailPage` entirely ❌

---

## 2. The Standard (proposed)

### Mobile standard (< 1024px)

Every quick action opens as a **bottom sheet**. None navigate away from `QuickGroupDetailPage`. The user can always dismiss with ✕ and return to the trip detail.

Sheet structure — identical to the AppSheet standard from `SHEET_AUDIT.md`:

```
SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"
```

- **Height**:
  - Complex flows (Add Expense, Scan Receipt): `92dvh`, keyboard-aware via `useKeyboardHeight`
  - Simple/read-only flows (Settle Up, View History): `92dvh` for Settle Up (has form view), `75dvh` for History (read-only)
- **Width**: `w-full` always — determined by viewport width, never changes
- **Header**: `shrink-0`, 3-slot flex row (back/spacer | title | ✕), `border-b`
- **Content**: `flex-1 overflow-y-auto overscroll-contain`
- **Footer/CTA**: `shrink-0` (if applicable)
- **dvh not vh** — mandatory on all height values

Width stability on keyboard open:
- The sheet uses `side="bottom"` which spans the full viewport width
- Width is determined by `inset-x-0` (from Radix), equivalent to `left: 0; right: 0`
- When the keyboard opens, only height recalculates. Width is viewport-locked.
- If width IS changing, it means something is setting an explicit width/max-width that reacts to viewport resize — find and remove it.

### Desktop standard (>= 1024px)

Every quick action opens as a **centered Dialog modal**. Not a bottom sheet. Not a full-screen page.

Modal spec:
- **Width**: `max-w-lg` (512px) — the Radix `DialogContent` default
- **Position**: centered horizontally and vertically (`left-[50%] top-[50%] translate`)
- **Background**: `bg-black/80` overlay (Radix default)
- **Border-radius**: `sm:rounded-lg` (Radix default)
- **Max-height**: `max-h-[85vh]` with internal `overflow-y-auto` if content overflows
- **Content**: same as the mobile sheet content — just presented in a centered modal
- **Dismiss**: Radix default ✕ (absolute top-right) is fine for dialogs

Exception: `ExpenseWizard` desktop Dialog currently uses `max-w-2xl` (672px) because its `ExpenseForm` has multi-column fields. This is acceptable — the form is a mature component used in both Quick and Full mode. Changing it to `max-w-lg` would cram the layout. **Keep `max-w-2xl` for Add Expense desktop only.**

### Breakpoint

Use `useMediaQuery('(max-width: 767px)')` for mobile detection (consistent with existing `useMediaQuery` hook pattern in the codebase). This matches the `md:` Tailwind breakpoint (768px).

Rationale: The `ExpenseWizard` already uses 768px as its breakpoint. The QuickLayout uses `lg:` (1024px) for header layout, but that's a different concern (header row vs content presentation). For sheet-vs-dialog switching, 768px is the right boundary — tablets in landscape should get the dialog experience.

### Keyboard behaviour (mobile)

When any input is focused and the keyboard opens:
- **Width**: unchanged. Always full viewport width (`inset-x-0`).
- **Height**: recalculates via `useKeyboardHeight`:
  ```tsx
  height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '<default>dvh'
  bottom: keyboard.isVisible ? `${Math.max(0, keyboard.keyboardHeight - keyboard.viewportOffset)}px` : undefined
  paddingBottom: keyboard.isVisible && keyboard.viewportOffset > 0 ? `${keyboard.viewportOffset}px` : undefined
  ```
- **Header**: stays fully visible — the `viewportOffset` adjustment prevents numpad from pushing it off screen.
- **Active input**: scrolls into view within the `overflow-y-auto` content area.
- **Footer/CTA**: stays accessible (sticky via `shrink-0`).

Only sheets with text/number inputs need `useKeyboardHeight`. Read-only sheets (History) and file-picker sheets (Scan Receipt) do not.

### Sheet-vs-Dialog switching pattern

```tsx
const isMobile = useMediaQuery('(max-width: 767px)')

return isMobile ? (
  <Sheet open={open} onOpenChange={onClose}>
    <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"
      style={{ height: '92dvh' }}>
      {/* header + content + footer */}
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
      {/* same header + content + footer */}
    </DialogContent>
  </Dialog>
)
```

---

## 3. Gap Analysis

| # | Button | Mobile: sheet? | Mobile: dvh? | Mobile: width stable? | Mobile: header stable? | Desktop: centered modal? | Desktop: fixed width? | Action needed |
|---|--------|---------------|-------------|----------------------|----------------------|------------------------|---------------------|---------------|
| 1 | Scan a receipt | ✅ Sheet | ✅ `92dvh` | ✅ `w-full` | ✅ `shrink-0` | ❌ Bottom sheet | ❌ No width constraint | 🔧 Add Dialog wrapper for desktop |
| 2 | Add an expense | ✅ Sheet | ✅ `92dvh` + keyboard | ✅ `w-full` | ✅ Full viewportOffset | ✅ Centered Dialog | ✅ `max-w-2xl` (exception) | ✅ Correct (keep as-is) |
| 3 | Settle up | ✅ Sheet | ✅ `92dvh` + keyboard | ✅ `w-full` | ⚠️ Missing viewportOffset | ❌ Bottom sheet | ❌ No width constraint | 🔧 Add viewportOffset fix + Dialog wrapper for desktop |
| 4 | View history | ❌ Page navigation | N/A | N/A | N/A | ❌ Page navigation | N/A | 🔨 Full rebuild: convert page to sheet/dialog overlay |

### Summary of changes needed

1. **Scan a receipt** — 🔧 Minor: Wrap content in Sheet (mobile) / Dialog (desktop) conditional. Mobile sheet is already correct.

2. **Add an expense** — ✅ No changes. Already has the best implementation (Sheet mobile + Dialog desktop).

3. **Settle up** — 🔧 Moderate: Add `viewportOffset` to keyboard style (matching MobileWizard pattern). Add Dialog wrapper for desktop.

4. **View history** — 🔨 Rebuild: Convert from page navigation (`navigate()`) to an overlay. Extract `QuickHistoryPage` content into a `QuickHistorySheet` component that renders as Sheet (mobile, `75dvh`, read-only) or Dialog (desktop, `max-w-lg max-h-[85vh]`). Update the button in `QuickGroupDetailPage` from `navigate()` to `setHistoryOpen(true)`.

### Which buttons navigate away on mobile?
- Only **View history** (#4) navigates away.

### Which are sheets but wrong height/width?
- None have wrong height/width. **Settle up** (#3) has correct height/width but incomplete keyboard handling.

### Which already work on desktop?
- Only **Add an expense** (#2) works correctly on desktop (Dialog).

---

## 4. Fix Log

| # | Button | Problem | Fix applied | Files changed | Status |
|---|--------|---------|-------------|---------------|--------|
| 0 | (infrastructure) | `DialogContent` has no `hideClose` prop | Added optional `hideClose` prop to `DialogContent`, matching `SheetContent` pattern | `src/components/ui/dialog.tsx` | ✅ Done |
| 1 | Scan a receipt | Desktop: bottom sheet instead of centered modal | Added `useMediaQuery` check — mobile renders Sheet, desktop renders Dialog with `hideClose max-h-[85vh] p-0 gap-0` | `src/components/receipts/ReceiptCaptureSheet.tsx` | ✅ Done |
| 2 | Add an expense | Already correct | No changes needed | — | ✅ N/A |
| 3 | Settle up | (a) Missing `viewportOffset` in keyboard style — numpad pushes header off screen. (b) Desktop: bottom sheet instead of centered modal | (a) Added `viewportOffset` subtraction from `bottom` + `paddingBottom` for offset, matching MobileWizard pattern. (b) Added `useMediaQuery` check — mobile renders Sheet, desktop renders Dialog with `hideClose max-h-[85vh] p-0 gap-0` | `src/components/quick/QuickSettlementSheet.tsx` | ✅ Done |
| 4 | View history | Navigates away to separate page (`/t/:tripCode/quick/history`) | Created `QuickHistorySheet` component — Sheet on mobile (`75dvh`, read-only), Dialog on desktop (`max-w-lg max-h-[85vh]`). Changed button in `QuickGroupDetailPage` from `navigate()` to `setHistoryOpen(true)`. Route kept for backward compat. | `src/components/quick/QuickHistorySheet.tsx` (NEW), `src/pages/QuickGroupDetailPage.tsx` | ✅ Done |

### Build verification
- `npm run type-check`: ✅ clean
- `npm test`: ✅ 140/140 tests pass

---

## 5. Playwright MCP Verification

Tested against `localhost:5173` with Supabase fully mocked via `page.route()` + `page.addInitScript()`.

### Mobile (375 × 812)

| # | Button | Opens as | Height | Width | URL changed? | Result |
|---|--------|----------|--------|-------|-------------|--------|
| 1 | Scan a receipt | Bottom sheet | `92dvh` | Full viewport | No (`/quick`) | ✅ PASS |
| 2 | Add an expense | Bottom sheet (MobileWizard) | `92dvh` | Full viewport | No (`/quick`) | ✅ PASS |
| 3 | Settle up | Bottom sheet | `92dvh` | Full viewport | No (`/quick`) | ✅ PASS |
| 4 | View history | Bottom sheet | `75dvh` | Full viewport | No (`/quick`) | ✅ PASS |

### Desktop (1280 × 800)

| # | Button | Opens as | Width | Centered? | URL changed? | Result |
|---|--------|----------|-------|-----------|-------------|--------|
| 1 | Scan a receipt | Centered Dialog | `max-w-lg` (512px) | ✅ | No (`/quick`) | ✅ PASS |
| 2 | Add an expense | Centered Dialog | `max-w-2xl` (672px, exception) | ✅ | No (`/quick`) | ✅ PASS |
| 3 | Settle up | Centered Dialog | `max-w-lg` (512px) | ✅ | No (`/quick`) | ✅ PASS |
| 4 | View history | Centered Dialog | `max-w-lg` (512px) | ✅ | No (`/quick`) | ✅ PASS |

### Console warnings (pre-existing, not in scope)
- Radix `Missing Description or aria-describedby` — from Sheet/Dialog without explicit description (cosmetic)
- `log-proxy` 401 — unauthenticated mock environment
