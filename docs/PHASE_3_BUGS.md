# Phase 3 Regression Audit — 2026-02-25

## Environment
- Branch: `fix/phase-3-regressions` (from `main` at `2b78c28`)
- Type-check: clean (137/137 tests pass before fixes)
- Tested: localhost dev server + production (split.xtian.me)

## Bug 1 (CRITICAL): Infinite re-render crash on Add Expense with wallet_groups

**Symptom:** Opening Add Expense dialog on trips with wallet_groups (e.g. Himos 2025, 12 participants in 4 groups) crashes with "Maximum update depth exceeded". The error boundary catches the crash and shows "Something went wrong".

**Root cause:** Radix `Checkbox` components in wallet_group headers were used as display-only indicators (`checked={allGroupSelected}`, no `onCheckedChange`, `pointer-events-none`). Despite being visually inert, Radix Checkbox's internal `useControllableState` triggered state cycles through `@radix-ui/react-compose-refs` → `setRef` → `dispatchSetState`, causing cascading re-renders that exceeded React's max update depth.

**Affected files:**
- `src/components/expenses/ExpenseForm.tsx` (desktop dialog)
- `src/components/expenses/wizard/WizardStep3.tsx` (mobile wizard step 3)

**Fix:** Replaced Radix `Checkbox` in group headers with a plain `<span>` styled to match checkbox appearance. The group header checkbox is purely decorative — using a native element eliminates all Radix internal state interference.

**Verification:** Confirmed Add Expense dialog opens and group toggle works on Himos 2025 trip (localhost). No console errors.

## Bug 2 (HIGH): SettlementsPage entity ID mismatch for wallet_group trips

**Symptom:** In families tracking mode, bank details and email addresses fail to display in the settlement plan. Payment reminder emails may fail to send or target the wrong recipient.

**Root cause:** After Phase 3, the settlement optimizer emits entity IDs (canonical participant IDs from `buildEntityMap`), not individual participant IDs. SettlementsPage built `fromEmailMap` and `bankDetailsMap` keyed by individual `p.id`, causing `undefined` lookups when entity IDs differed from participant IDs. The `handleRemind` function also used raw entity IDs instead of expanding to all participants in the wallet_group.

**Affected file:** `src/pages/SettlementsPage.tsx`

**Fix:** Used `buildEntityMap` to map participant IDs to entity IDs in `fromEmailMap`, `bankDetailsMap`, and `handleRemind` — matching the pattern already correctly implemented in `QuickSettlementSheet.tsx`.

**Note:** QuickSettlementSheet.tsx was already correct (fixed during Phase 3).

## Components Verified (no issues)

| Component | File | Status |
|-----------|------|--------|
| ExpenseCard distribution text | `src/components/ExpenseCard.tsx` | OK — handles individuals-only format |
| ParticipantsSetup | `src/components/setup/ParticipantsSetup.tsx` | OK — all checkboxes properly controlled |
| QuickSettlementSheet | `src/components/quick/QuickSettlementSheet.tsx` | OK — entity map usage correct |
| calculateBalances callers (10 sites) | Multiple files | OK — all use correct 6-arg signature |
| ManageTripPage toggle | `src/pages/ManageTripPage.tsx` | OK — shows/hides correctly |
| WizardStep3 group toggle | `src/components/expenses/wizard/WizardStep3.tsx` | OK (after fix) |
| Settlement optimizer | `src/services/settlementOptimizer.ts` | OK — consumes ParticipantBalance[] |
| Excel/PDF export | `src/services/excelExport.ts`, `pdfExport.ts` | OK — no family-specific branching |
| Transaction history builder | `src/services/transactionHistoryBuilder.ts` | OK — uses entity map |
