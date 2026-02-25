Read `FAMILY_REFACTOR.md` before doing anything else. Confirm in chat which phase you are executing and what the current phase status shows. Do not proceed if Phase 2 is not marked COMPLETE with a PR number.

---

## Phase 3 — UI Simplification

You are removing the parallel entity model. This phase:
1. Migrates distribution JSONB data from `families`/`mixed` → `individuals`
2. Adds `account_for_family_size` to trip settings
3. Simplifies all UI components
4. Merges `FamiliesSetup.tsx` + `IndividualsSetup.tsx` into `ParticipantsSetup.tsx`
5. Removes the deprecated V1 calculator
6. Removes deduplication guards
7. Drops `family_id` FK and `families` table

**This phase contains irreversible data changes.** Take snapshots before each destructive step.

---

### Step 1: Read the files you'll modify

Read these completely before writing any code:

- `src/components/expenses/ExpenseForm.tsx` (~1000 lines) — distribution builder at lines 326-399, restore at lines 139-154
- `src/components/expenses/wizard/WizardStep3.tsx` — families UI and accountForFamilySize toggle (lines 122-146)
- `src/components/expenses/ExpenseSplitPreview.tsx` (374 lines) — 3-way branch on distribution.type
- `src/components/setup/FamiliesSetup.tsx` (906 lines) — to be deleted
- `src/components/setup/IndividualsSetup.tsx` (349 lines) — to become ParticipantsSetup.tsx
- `src/pages/ManageTripPage.tsx` — imports FamiliesSetup (line 12)
- `src/components/quick/QuickParticipantSetupSheet.tsx` — imports FamiliesSetup (line 4)
- `src/components/quick/QuickSettlementSheet.tsx` — entity ID resolution (lines 57-66, 91-113, 128-170)
- `src/services/excelExport.ts` — distribution type branching (lines 26-42)
- `src/types/expense.ts` — FamiliesDistribution, MixedDistribution types
- `src/types/participant.ts` — Family interface, CreateFamilyInput, UpdateFamilyInput

---

### Step 2: Add `account_for_family_size` to trips

Before creating any migration file, check the highest existing migration number:

```bash
ls supabase/migrations/ | sort | tail -5
```

Use the next number in sequence. The plan assumes `030` but if Phase 1 or Phase 2 used different numbers, or other migrations were added in between, adjust all migration filenames in this prompt accordingly. Note the actual numbers you use in `FAMILY_REFACTOR.md`.

Create `supabase/migrations/030_trip_account_for_family_size.sql` (or next available number):

```sql
ALTER TABLE trips ADD COLUMN account_for_family_size BOOLEAN NOT NULL DEFAULT false;
```

Update the Trip TypeScript type to include `account_for_family_size: boolean`.

Show and wait for approval before running.

---

### Step 3: Backfill trip-level `account_for_family_size`

For each trip in families mode, check if any of its expenses have `distribution.accountForFamilySize === true`. If the majority do, set the trip-level flag to true.

```sql
-- Set account_for_family_size = true for trips where most expenses use it
UPDATE trips t
SET account_for_family_size = true
WHERE t.tracking_mode = 'families'
  AND (
    SELECT COUNT(*) FROM expenses e
    WHERE e.trip_id = t.id
      AND (e.distribution->>'accountForFamilySize')::boolean = true
  ) > (
    SELECT COUNT(*) / 2 FROM expenses e
    WHERE e.trip_id = t.id
      AND e.distribution->>'type' IN ('families', 'mixed')
  );
```

Show and wait for approval.

---

### Step 4: Migrate distribution JSONB

Write migration `supabase/migrations/031_migrate_distributions.sql` (or a script if SQL is too complex):

For each expense with `distribution.type = 'families'` or `'mixed'`:
1. Expand family IDs to their member participant IDs (query `participants` WHERE `family_id = <family-uuid>`)
2. Merge with any standalone participant IDs (for mixed)
3. Convert split values:
   - Equal split: set `type: 'individuals'`, list all participant IDs
   - Percentage/amount family splits: distribute the family's value equally among its members
4. Remove `accountForFamilySize` from the distribution (now at trip level)
5. Set `type: 'individuals'`

**Take a full backup/snapshot of the expenses table before running this.**

Show the migration in chat and wait for explicit approval. Verify with a SELECT query that all distributions now have `type = 'individuals'`.

### Step 4b: Immediate snapshot comparison after JSONB migration

**Do not proceed to Step 5 until this passes.**

This is the highest-risk step in the entire refactor. A discrepancy here must be caught immediately — not at the final verification 10 steps later when it will be much harder to trace.

Run the balance snapshot comparison now, immediately after the JSONB migration:

1. Run `calculateBalancesV2` for every trip against the newly migrated data
2. Compare output to `balance_snapshot_pre.json` by entity name
3. Report any discrepancy in full detail: trip_id, entity name, field, old value, new value

**Zero discrepancies required before continuing.**

If any discrepancy is found:
- STOP immediately
- Do not proceed to Step 5
- Roll back the JSONB migration if possible (the migration should be wrapped in a transaction)
- Report the full discrepancy to the user with the raw before/after distribution data for the affected expense
- Wait for explicit instruction before doing anything else

Only proceed to Step 5 after this comparison returns zero discrepancies.

---

### Step 5: Simplify TypeScript types

In `src/types/expense.ts`:
- Remove `FamiliesDistribution` interface (lines 31-37)
- Remove `MixedDistribution` interface (lines 39-47)
- Remove `FamilySplit` interface (lines 19-22)
- Remove `'families' | 'mixed'` from `DistributionType` (line 11) — make it just `'individuals'`
- Remove `ExpenseDistribution` union — it's now just `IndividualsDistribution`

In `src/types/participant.ts`:
- Remove `Family` interface (lines 1-7)
- Remove `CreateFamilyInput` interface (lines 19-24)
- Remove `UpdateFamilyInput` interface (lines 34-38)
- Remove `family_id` from `Participant`, `CreateParticipantInput`, `UpdateParticipantInput`

---

### Step 6: Remove deprecated V1 calculator

In `src/services/balanceCalculator.ts`:
- Delete the deprecated `calculateBalances` function (original V1)
- Delete the deprecated `calculateExpenseShares` function (original V1)
- Rename `calculateBalancesV2` → `calculateBalances`
- Remove the backward-compat code in V2 that handles `distribution.type === 'families'` and `'mixed'` — after Phase 3 Step 4, no such distributions exist in the database
- Remove all 4 deduplication guards in the calculator (lines 222-232, 322-330, 382-389, 416-423 — these prevent double-counting between family and individual entities, which no longer exists)

---

### Step 7: Simplify ExpenseSplitPreview

In `src/components/expenses/ExpenseSplitPreview.tsx`:
- Remove the `families` and `mixed` branches (lines 80-298)
- Remove the 3 deduplication guards (lines 167-173, 237-242, 278-283)
- Keep only the `individuals` branch (lines 38-79)
- Remove the `accountForFamilySize` prop
- Remove the `Family` import and `families` prop

---

### Step 8: Simplify ExpenseForm

In `src/components/expenses/ExpenseForm.tsx`:
- Remove the 3-list split UI (families checkboxes, standalone individuals, all individuals)
- Show only one list: all participants, with wallet_group labels as section headers
- Remove distribution type construction for `families` and `mixed` (lines 326-399)
- Always build `type: 'individuals'` distribution
- Remove the `trackingMode` branching in the form

---

### Step 9: Simplify WizardStep3

In `src/components/expenses/wizard/WizardStep3.tsx`:
- Remove the `accountForFamilySize` per-expense toggle (lines 122-146)
- Remove families-specific UI sections
- Show one participant list grouped by wallet_group
- Always build `type: 'individuals'` distribution

---

### Step 10: Add accountForFamilySize to trip settings

In the trip form/settings (likely `TripForm.tsx`):
- Add a toggle: "Split proportionally by group size"
- Description: "When on, larger groups pay proportionally more. When off, each group pays an equal share."
- Only show when any participant has a wallet_group

---

### Step 11: Merge setup components

Create `src/components/setup/ParticipantsSetup.tsx` by evolving `IndividualsSetup.tsx`:
- Add wallet_group support: allow users to assign participants to groups
- UI: participant list with optional "Shared wallet" group label
- Remove all family CRUD logic (no more families table)

Delete `src/components/setup/FamiliesSetup.tsx`.

Update imports in:
- `src/pages/ManageTripPage.tsx` (line 12)
- `src/components/quick/QuickParticipantSetupSheet.tsx` (line 4)

---

### Step 12: Simplify QuickSettlementSheet

In `src/components/quick/QuickSettlementSheet.tsx`:
- Remove `resolveParticipantId` (lines 165-170) — all entity IDs are now participant IDs
- Simplify `myEntityId` (lines 93-95, 109-113) — no more family_id branching
- Simplify `fromEmailMap` (lines 57-66) — no family_id mapping
- Simplify bank details mapping (lines 128-158) — key by participant.id only
- Remove `tracking_mode` references from remind logic (lines 182-190)

---

### Step 13: Simplify excelExport

In `src/services/excelExport.ts`:
- Remove the `families` and `mixed` branches (lines 31-42)
- Keep only the `individuals` branch
- Remove `Family` import

---

### Step 14: Simplify settlementOptimizer

In `src/services/settlementOptimizer.ts`:
- Remove `isFromFamily` and `isToFamily` from `SettlementTransaction` (lines 9-10)
- Remove them from transaction creation (lines 75-76)

---

### Step 15: Drop family_id FK

Create `supabase/migrations/032_drop_family_id.sql`:

```sql
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_family_id_fkey;
ALTER TABLE participants DROP COLUMN family_id;
```

Show and wait for approval.

---

### Step 16: Drop families table

Create `supabase/migrations/033_drop_families_table.sql`:

```sql
DROP TABLE IF EXISTS families;
```

**Show and wait for EXPLICIT approval.** This is irreversible.

---

### Step 17: Final verification

1. `npm run type-check` — must pass clean
2. `npm test` — update/fix broken tests, all must pass
3. Run balance snapshot comparison: current balances vs `balance_snapshot_pre.json` — zero discrepancies by entity name
4. Run the app locally and verify:
   - Creating a new expense in individuals mode works
   - Creating a new expense with wallet_group participants works
   - Settlements display correctly
   - Excel export works

---

### Step 18: Commit and update state

1. Create branch `refactor/family-phase-3-ui`
2. Commit all changes (multiple commits for logical grouping if needed)
3. Create PR, merge via squash
4. Update `FAMILY_REFACTOR.md`:
   - Phase 3 status → `COMPLETE`
   - PR number
   - Append to Phase Log: files deleted, components merged, any issues

**Hard stop.** Phase 3 is complete. Use `PHASE_4_PROMPT.md` for the next session.
