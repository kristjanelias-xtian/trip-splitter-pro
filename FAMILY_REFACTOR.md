# Family Entity Refactor
> Started: 2026-02-24
> Status: PLANNING COMPLETE — READY FOR PHASE 1
> Executor: read this file at the start of every phase session to understand where things stand.

## Architecture Summary

### Current Model (parallel entities)

The app uses a **parallel entity model** for shared-wallet groups. A `families` table stores group metadata (name, adults count, children count). Each `participant` optionally references a `family_id`. Expense distribution JSONB stores **family UUIDs** as first-class split targets via three distribution types: `individuals`, `families`, and `mixed`. The balance calculator, settlement optimizer, split preview, and Excel export all branch on these three types. The `mixed` type exists solely because families-mode trips can have standalone participants who aren't in any family.

This produces 536 family-related references across 44 files, 5+ deduplication guards to prevent double-counting (same person appearing in both a family selection and individual selection), and a 906-line `FamiliesSetup.tsx` (2.6x the equivalent `IndividualsSetup.tsx`).

### Target Model (grouping tag)

Replace the `families` table and `family_id` FK with a `wallet_group TEXT` column on `participants`. Expenses reference **only participant IDs** (one distribution type: `individuals`). The balance calculator groups by `wallet_group` at display time. The `families` and `mixed` distribution types are eliminated. `accountForFamilySize` moves from per-expense to trip-level. ~1,350 fewer lines, 44 → ~35 files.

## Key Files

### Phase 1 — Data Migration
| File | Why |
|------|-----|
| `supabase/migrations/029_add_wallet_group.sql` | Add `wallet_group TEXT` to participants |
| `src/services/balanceCalculator.ts` | Read for snapshot script (function signature) |
| `src/services/balanceCalculator.test.ts` | Reference for parity tests |

### Phase 2 — Engine Swap
| File | Why |
|------|-----|
| `src/services/balanceCalculator.ts` | Write V2 alongside V1, then swap |
| `src/services/balanceCalculator.test.ts` | Parity tests for V2 |
| `src/services/settlementOptimizer.ts` | Update `isFamily` → `isGroup` or remove |
| `src/services/transactionHistoryBuilder.ts` | Uses `myEntityId` (family_id in families mode) |
| `src/services/excelExport.ts` | Distribution type branching (lines 26-42) |
| `src/types/expense.ts` | Simplify `ExpenseDistribution` union |

### Phase 3 — UI Simplification
| File | Why |
|------|-----|
| `src/components/expenses/ExpenseForm.tsx` | Remove 3-list split UI (lines 326-399) |
| `src/components/expenses/wizard/WizardStep3.tsx` | Remove accountForFamilySize toggle, simplify |
| `src/components/expenses/ExpenseSplitPreview.tsx` | Remove families/mixed preview branches (lines 80-298) |
| `src/components/setup/FamiliesSetup.tsx` | Delete entirely |
| `src/components/setup/IndividualsSetup.tsx` | Rename/evolve into ParticipantsSetup.tsx |
| `src/components/quick/QuickSettlementSheet.tsx` | Simplify entity ID resolution |
| `src/pages/ManageTripPage.tsx` | References FamiliesSetup |
| `src/components/quick/QuickParticipantSetupSheet.tsx` | References FamiliesSetup |
| `src/types/participant.ts` | Remove Family interface, remove family_id from Participant |
| `supabase/migrations/030_drop_family_id.sql` | Drop FK |
| `supabase/migrations/031_drop_families_table.sql` | Drop table |

### Phase 4 — Family Balance View
| File | Why |
|------|-----|
| `src/components/quick/QuickGroupDetailPage.tsx` | Add within-group toggle |
| `src/components/quick/QuickBalanceHero.tsx` | Display within-group balances |
| `src/services/balanceCalculator.ts` | Add within-group calculation helper |

## Schema: Current State

### `families` table
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
family_name TEXT NOT NULL,
adults INTEGER NOT NULL CHECK (adults > 0),
children INTEGER NOT NULL DEFAULT 0
```

### `participants` table
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
family_id UUID REFERENCES families(id) ON DELETE CASCADE,  -- nullable
name TEXT NOT NULL,
is_adult BOOLEAN NOT NULL DEFAULT true,
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable
email TEXT  -- nullable
```

### Distribution JSONB (on `expenses.distribution`)
```ts
// Union of three types:
IndividualsDistribution { type: 'individuals', participants: string[], splitMode?, participantSplits? }
FamiliesDistribution { type: 'families', families: string[], splitMode?, familySplits?, accountForFamilySize? }
MixedDistribution { type: 'mixed', families: string[], participants: string[], splitMode?, familySplits?, participantSplits?, accountForFamilySize? }
```

### Settlement optimizer output
```ts
SettlementTransaction { fromId, fromName, toId, toName, amount, isFromFamily, isToFamily }
```
In families mode, `fromId`/`toId` are family UUIDs, not participant IDs.

## Schema: Target State

### `families` table — **DROPPED**

### `participants` table
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
-- family_id DROPPED
wallet_group TEXT,  -- nullable; e.g. "The Smiths"
name TEXT NOT NULL,
is_adult BOOLEAN NOT NULL DEFAULT true,
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
email TEXT
```

### Distribution JSONB — **unified**
```ts
// Single type only:
IndividualsDistribution { type: 'individuals', participants: string[], splitMode?, participantSplits? }
```
All existing `families` and `mixed` distributions are migrated to `individuals` with expanded participant IDs.

### `trips` table — **new column**
```sql
account_for_family_size BOOLEAN NOT NULL DEFAULT false  -- moved from per-expense
```

### Settlement optimizer output — simplified
```ts
SettlementTransaction { fromId, fromName, toId, toName, amount }
// isFromFamily/isToFamily removed — IDs are always participant IDs
```

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Balance discrepancy after migration** | Critical | Snapshot all balances pre-migration, verify zero discrepancy at each phase boundary |
| **Existing `families`/`mixed` expenses in production** | High | Phase 1 backfill: expand family IDs → participant IDs in distribution JSONB. Verify with snapshot. |
| **Settlement optimizer emits family IDs** | Medium | Phase 2: V2 calculator outputs participant IDs only. Optimizer `isFamily` flag removed. |
| **`resolveParticipantId` in QuickSettlementSheet** | Medium | Phase 3: remove entirely — IDs are always participant IDs after Phase 2 |
| **`bankDetailsMap` keyed by family ID** | Medium | Phase 3: key by participant ID directly |
| **`fromEmailMap` maps family_id → email** | Medium | Phase 3: simplify to participant.id → email |
| **FamiliesSetup.tsx imported by ManageTripPage + QuickParticipantSetupSheet** | Low | Phase 3: replace imports with new ParticipantsSetup |
| **9 existing tests cover families/mixed logic** | Low | Phase 2: parity tests verify V2 matches V1 before old tests are updated |
| **`adults`/`children` counts on families table lost when table is dropped** | Medium | Already captured on individual participants via `is_adult`. `wallet_group` members' `is_adult` status is the source of truth after migration. |
| **`accountForFamilySize` on existing expense distributions** | Medium | Phase 2: V2 calculator reads trip-level flag instead. Existing per-expense values honored during transition. |
| **Edge functions** | None | No edge functions reference families or distribution types |

## Phase Status

| Phase | Status | PR | Sign-off |
|---|---|---|---|
| 1 — Migration | COMPLETE | #386 | type-check clean, 140/140 tests, backfill verified |
| 2 — Engine | COMPLETE | #387 | type-check clean, 152/152 tests, zero snapshot discrepancies |
| 3 — UI | COMPLETE | #388 | type-check clean, 137/137 tests, -3013 net lines |
| 4 — Feature | COMPLETE | #395 | type-check clean, 143/143 tests |

## Balance Snapshot

Saved to `balance_snapshot_pre.json` (project root). 6 trips, all balances captured with V1 calculator. Generated by `scripts/snapshot_balances.ts`.

## Phase Log

### Phase 1 — 2026-02-24

- Migration 029 applied: `ALTER TABLE participants ADD COLUMN wallet_group TEXT`
- Backfill: 25 participants across 7 families updated via Node.js script (no psql available; used @supabase/supabase-js client)
- Verification: zero mismatches — all participants with `family_id` have matching `wallet_group`; all standalone participants have `wallet_group IS NULL`
- TypeScript types updated: `wallet_group?: string | null` added to `Participant`, `CreateParticipantInput`, `UpdateParticipantInput`
- Balance snapshot: 6 trips captured (2 families-mode, 4 individuals-mode)
- No deviations from plan. PR #386 merged via squash.

### Phase 2 — 2026-02-24

**Entity ID decision:** Option (b) — first adult participant's ID in the wallet_group, sorted alphabetically by name. Keeps IDs as UUIDs, deterministic, no family UUID dependency.

- `buildEntityMapV2(participants, trackingMode)` — exported. Groups by `wallet_group` in families mode; standalone entities in individuals mode.
- `calculateExpenseSharesV2(expense, participants, families, trackingMode, entityMap?)` — exported. Returns shares keyed by V2 canonical entity IDs. Backward-compat with `families`/`mixed` distributions via `families` param (uses family.adults+children for size, maps family IDs to wallet_group entities via `familyToEntityId`).
- `calculateBalancesV2(...)` — exported. Same signature as V1. Entity IDs are always participant UUIDs (canonical for wallet_group, own ID for standalone).
- V1 `calculateBalances` and `calculateExpenseShares` marked `@deprecated` (not deleted).
- 12 parity tests: 9 from `calculateExpenseShares`, 3 from `calculateBalances`. All compare by entity name with 0.01 tolerance.
- Snapshot comparison: 6 trips, zero discrepancies (including 2 families-mode trips with settlements).
- `transactionHistoryBuilder.ts`: `myEntityId` updated from `trackingMode === 'families' && family_id` branching to `entityMap.participantToEntityId.get(myParticipant.id)`. Test updated to include `wallet_group`.
- All 10 callers swapped: 8 `calculateBalances` → `calculateBalancesV2`, 2 `calculateExpenseShares` → `calculateExpenseSharesV2`.
- `settlementOptimizer.ts`: no changes needed — consumes `ParticipantBalance[]` (same shape).
- `excelExport.ts`: no changes needed — only imports `ParticipantBalance` type and accesses distribution JSONB directly.
- 152/152 tests pass. Type-check clean.

### Phase 3 — 2026-02-24

40 files changed, -3013 net lines (597 added, 3610 removed).

**Types simplified:**
- `ExpenseDistribution` reduced to `IndividualsDistribution` only — `FamiliesDistribution`, `MixedDistribution` removed
- `Family`, `CreateFamilyInput`, `UpdateFamilyInput` interfaces removed from `types/participant.ts`
- `family_id` removed from `Participant` and `CreateParticipantInput`
- `isFromFamily`/`isToFamily` removed from `SettlementTransaction`

**Calculator & services:**
- V1 `calculateBalances`, `calculateExpenseShares` deleted — V2 versions renamed to primary exports
- `balanceCalculator.ts`: 697 → ~180 lines (families/mixed branching removed)
- `balanceCalculator.test.ts`: 523 → ~150 lines (families/mixed parity tests removed, V2-specific tests retained)
- `settlementOptimizer.ts`: `isFromFamily`/`isToFamily` removed
- `transactionHistoryBuilder.ts`: families-mode entity resolution removed
- `excelExport.ts`: family-specific branching removed, "Participant/Family" → "Participant"
- `pdfExport.ts`: "Participant/Family" → "Participant"

**UI components simplified:**
- `FamiliesSetup.tsx` (906 lines) deleted entirely
- New `ParticipantsSetup.tsx` created — unified component with wallet_group support (datalist autocomplete, inline group editor, grouped display)
- `ExpenseForm.tsx`: 511 lines removed (3-list split UI for families/mixed eliminated)
- `ExpenseSplitPreview.tsx`: 321 lines removed (families/mixed preview branches)
- `ExpenseWizard.tsx`: 190 lines removed (accountForFamilySize toggle, families-mode logic)
- `WizardStep3.tsx`: 250 lines removed (family/mixed selection lists)
- `WizardStep4.tsx`: 68 lines removed (accountForFamilySize toggle)
- `QuickSettlementSheet.tsx`: entity ID resolution simplified (always participant IDs)
- `SettlementsPage.tsx`: email map, bank details, remind handler simplified
- `SettlementForm.tsx`: `familyName` → `groupName`, removed families-mode branching
- `LinkParticipantDialog.tsx`: removed family name resolution, uses `wallet_group` directly
- `ExpenseCard.tsx`: removed families/mixed distribution text branches

**Context:**
- `ParticipantContext.tsx`: removed families state, fetch, CRUD (createFamily, updateFamily, deleteFamily, getParticipantsByFamily)

**Trip settings:**
- `ManageTripPage.tsx`: added "Proportional Group Splitting" toggle (only shown when any participant has `wallet_group`)
- `account_for_family_size` added to trip feature toggles

**Display labels:**
- "Family" badge → "Group" in BalanceCard, CostBreakdownDialog, QuickBalanceHero

**Migrations:**
- 030: `ALTER TABLE trips ADD COLUMN account_for_family_size BOOLEAN NOT NULL DEFAULT false`
- 031: Drop `family_id` FK and column from participants
- 032: Drop `families` table

137/137 tests pass. Type-check clean.

### Phase 3 Regression Fix — 2026-02-25

PR #392: Fixed 2 regressions introduced by Phase 3.

**Bug 1 (CRITICAL): Infinite re-render crash on Add Expense with wallet_groups**
- Radix `Checkbox` in wallet_group group headers (controlled `checked`, no `onCheckedChange`, `pointer-events-none`) triggered internal `useControllableState` state cycles → "Maximum update depth exceeded"
- Fix: replaced Radix Checkbox with plain `<span>` styled to match checkbox appearance
- Files: `ExpenseForm.tsx`, `WizardStep3.tsx`

**Bug 2 (HIGH): SettlementsPage entity ID mismatch**
- `fromEmailMap`, `bankDetailsMap`, `handleRemind` were keyed by `p.id` but settlement optimizer emits entity IDs from `buildEntityMap`
- Fix: used `buildEntityMap` throughout, matching the pattern already correct in `QuickSettlementSheet.tsx`
- File: `SettlementsPage.tsx`

Documented in `PHASE_3_BUGS.md`.

### Phase 4 — 2026-02-25

Within-group balance view — the feature that motivated the entire refactor.

**New function:** `calculateWithinGroupBalances(expenses, participants, walletGroup, defaultCurrency, exchangeRates)` in `balanceCalculator.ts`
- Only considers expenses paid by a group member (external payers don't affect within-group fairness)
- Credits payer with the group's share only (not full expense), so balances net to zero
- Returns `ParticipantBalance[]` sorted by balance descending

**UI:** Toggle in `QuickGroupDetailPage.tsx` — "Within-group balances"
- Session-only state (`useState<boolean>(false)`)
- When ON: shows a Card per wallet_group with per-member balance breakdowns
- Empty state: "No shared expenses yet" for groups with no group-paid expenses
- Disabled when trip has no wallet_groups
- Inline content (no bottom sheet), follows existing Card patterns

**Tests:** 6 new tests for `calculateWithinGroupBalances`:
- One member paid all → imbalanced
- Proportional split → partial test
- Each pays fair share → evenly split (all ~0)
- Member not in any expense → zero balance
- Outsider pays → evenly split (ignored)
- Non-existent group → empty array

143/143 tests pass. Type-check clean.

**Family entity refactor is COMPLETE.** All 4 phases done.
