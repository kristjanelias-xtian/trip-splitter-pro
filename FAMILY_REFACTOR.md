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
| 1 — Migration | NOT STARTED | — | — |
| 2 — Engine | NOT STARTED | — | — |
| 3 — UI | NOT STARTED | — | — |
| 4 — Feature | NOT STARTED | — | — |

## Balance Snapshot

_To be populated by Phase 1. Format: JSON file with per-trip, per-entity balances computed by the current `calculateBalances` function._

## Phase Log

_Each phase will append its findings, decisions, and any deviations from the plan here._
