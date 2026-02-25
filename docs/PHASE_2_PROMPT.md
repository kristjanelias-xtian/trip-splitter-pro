Read `FAMILY_REFACTOR.md` before doing anything else. Confirm in chat which phase you are executing and what the current phase status shows. Do not proceed if Phase 1 is not marked COMPLETE with a PR number.

---

## Phase 2 — Engine Swap

You are writing a new balance calculator (`calculateBalancesV2`) that uses `wallet_group` on participants instead of the `families` table, runs it in parallel with V1 to verify parity, then swaps all callers to V2.

---

### Step 1: Read the current calculator in full

Read these files completely before writing any code:

- `src/services/balanceCalculator.ts` (503 lines) — the entire file
- `src/services/balanceCalculator.test.ts` — the entire file
- `src/services/settlementOptimizer.ts` (134 lines) — the entire file
- `src/services/transactionHistoryBuilder.ts` (126 lines) — uses `calculateExpenseShares`
- `src/services/excelExport.ts` — uses distribution type branching (lines 26-42)
- `src/types/expense.ts` — distribution type definitions
- `src/types/participant.ts` — Participant interface (should now have `wallet_group`)
- `balance_snapshot_pre.json` — the Phase 1 snapshot

---

### Step 2: Understand what V2 must change

**V1 behaviour (what to preserve):**
- Input: `(expenses, participants, families, trackingMode, settlements, defaultCurrency, exchangeRates)`
- For `trackingMode === 'families'`: entities are families (keyed by family UUID) + standalone participants
- For `trackingMode === 'individuals'`: entities are participants (keyed by participant UUID)
- Distribution type branches: `individuals` → `families` → `mixed`, each with equal/percentage/amount sub-branches
- Output: `ParticipantBalance[]` with `id` = entity UUID, `isFamily` flag

**V2 behaviour (what changes):**
- Input: same signature BUT `families` parameter becomes optional/unused (kept for backward compat)
- Entity grouping: participants with the same `wallet_group` value are grouped. Participants with `wallet_group === null` are standalone entities.
- No branching on distribution type for the grouping logic. Instead:
  - For **existing** `families`/`mixed` distributions (backward compat): map family IDs to participant IDs via the `families` parameter, then apply wallet_group grouping
  - For `individuals` distributions: apply wallet_group grouping directly
- `accountForFamilySize` handling: V2 reads this from the expense distribution (existing per-expense field). When true, split per-person then aggregate by wallet_group. When false, count wallet_groups as equal entities.
- Output: same `ParticipantBalance[]` shape. For grouped entities: `id` = first adult participant's ID in the group (canonical ID), `name` = wallet_group name, `isFamily` = true.

**CRITICAL design decision — entity IDs in V2:**
The canonical entity ID for a wallet_group must be deterministic and stable. Options:
a) Use the wallet_group string as the ID (simplest, but changes the ID type from UUID to string)
b) Use the first participant's ID (sorted alphabetically by name) as canonical ID
c) Keep using family IDs during the backward-compat period

Choose the approach that makes parity testing easiest. Document your choice in `FAMILY_REFACTOR.md` Phase Log.

---

### Step 3: Write `calculateBalancesV2`

Add it to `src/services/balanceCalculator.ts` alongside the existing function. Do NOT modify V1 yet.

The V2 function must:
1. Build entity map from `wallet_group` on participants (group participants with same wallet_group)
2. For each expense, calculate shares using the distribution JSONB:
   - If `distribution.type === 'individuals'`: process participant IDs directly, then aggregate by wallet_group
   - If `distribution.type === 'families'`: expand family IDs to member participant IDs (using `families` param), then aggregate by wallet_group
   - If `distribution.type === 'mixed'`: expand families, deduplicate, aggregate by wallet_group
3. Handle `splitMode` (equal/percentage/amount) for each distribution type
4. Handle `accountForFamilySize` (per-expense flag, same logic as V1 but using wallet_group size)
5. Apply settlements (using `getEntityIdForParticipant` equivalent that maps to wallet_group entity)
6. Return `BalanceCalculation` with same shape as V1

---

### Step 4: Write parity tests

In `src/services/balanceCalculator.test.ts`, add a new describe block: `'calculateBalancesV2 parity'`.

For each of these existing V1 test cases, write a matching V2 test that verifies identical output (by entity name, not necessarily by entity ID):

**From `calculateExpenseShares` block:**
1. "splits evenly among listed individuals"
2. "aggregates to family in families tracking mode"
3. "splits evenly among families as units by default"
4. "splits proportionally by family size"
5. "splits families by percentage"
6. "splits families by custom amount"
7. "deduplicates family members from standalone participants"
8. "splits by percentage for families and standalone participants"
9. "splits by custom amount for families and standalone participants"

**From `calculateBalances` block:**
10. "credits payer and debits shares correctly"
11. "applies settlements to balances"
12. "handles families tracking mode with standalone participants"

Each parity test should:
- Use the same input data as the V1 test
- Call `calculateBalancesV2` with the same arguments
- Assert that for each entity name, the `totalPaid`, `totalShare`, and `balance` values match V1's output within a tolerance of 0.01

---

### Step 5: Run parity tests

Run `npm test`. All existing V1 tests must still pass. All new V2 parity tests must pass.

If any parity test fails, fix V2 until all pass. Do NOT modify V1.

---

### Step 6: Snapshot comparison

Write a variant of the Phase 1 snapshot script that:
1. Loads `balance_snapshot_pre.json`
2. For each trip, calls `calculateBalancesV2` with the same data
3. Compares V1 and V2 balances by entity name
4. Reports any discrepancies

**Zero discrepancies required.** If any trip shows a discrepancy, investigate and fix V2.

---

### Step 7: Fix transactionHistoryBuilder.ts myEntityId logic

Before swapping callers, specifically address `src/services/transactionHistoryBuilder.ts`.

Read the file in full. It contains `myEntityId` logic that resolves the current user's entity ID — in families mode this returns the family UUID, not the participant UUID. This is flagged as a medium risk in `FAMILY_REFACTOR.md`.

In V2, entity IDs are always participant IDs (or wallet_group canonical IDs per the decision in Step 2). Update `myEntityId` resolution so it:
- No longer branches on `tracking_mode === 'families'`
- Resolves the current user's participant ID directly
- If the user's participant belongs to a wallet_group, uses the canonical wallet_group entity ID (matching V2's output)

Show the before and after of this function. Wait for confirmation before applying.

### Step 8: Swap all callers

Replace `calculateBalances` with `calculateBalancesV2` in these files:

- `src/components/quick/QuickSettlementSheet.tsx` (line 76)
- `src/services/transactionHistoryBuilder.ts` (line 47 — now updated in Step 7)
- `src/components/quick/QuickBalanceHero.tsx` or wherever the home page balance is computed
- Any other file that imports `calculateBalances` or `calculateExpenseShares` — search with: `grep -rn "calculateBalances\|calculateExpenseShares" src/ --include="*.ts" --include="*.tsx"`

Also update `settlementOptimizer.ts` if needed — it consumes `ParticipantBalance[]` from the calculator. If V2's output shape is identical, no changes needed.

---

### Step 8: Mark V1 as deprecated

Add `@deprecated` JSDoc to the original `calculateBalances` and `calculateExpenseShares` functions. Do NOT delete them yet.

---

### Step 9: Run full verification

1. `npm run type-check` — must pass clean
2. `npm test` — all tests must pass
3. Run snapshot comparison again with V2 as the primary — zero discrepancies
4. Save new snapshot as `balance_snapshot_v2.json`

---

### Step 10: Commit and update state

1. Create branch `refactor/family-phase-2-engine`
2. Commit all changes
3. Create PR, merge via squash
4. Update `FAMILY_REFACTOR.md`:
   - Phase 2 status → `COMPLETE`
   - PR number
   - Append to Phase Log: entity ID decision, any parity issues found and resolved

**Hard stop.** Phase 2 is complete. Use `PHASE_3_PROMPT.md` for the next session.
