Read `FAMILY_REFACTOR.md` before doing anything else. Confirm in chat which phase you are executing and what the current phase status shows. Do not proceed if the previous phase is not marked COMPLETE with a PR number.

---

## Phase 1 — Data Migration

You are executing Phase 1 of the family entity refactor. This phase has three jobs:

1. Add `wallet_group TEXT` to the `participants` table
2. Backfill it from the `families` table
3. Snapshot all current balances for future parity verification

You are NOT modifying any application code, calculator logic, or UI in this phase.

---

### Step 1: Verify preconditions

Read these files to confirm the current state:

- `src/types/participant.ts` — Confirm `Participant` interface has `family_id: string | null` and does NOT have `wallet_group`
- `supabase/migrations/` — Confirm the highest migration is `028_receipt_category.sql`

If `wallet_group` already exists on the participants table, STOP and report this in chat.

---

### Step 2: Write the migration

Before creating any migration file, check the highest existing migration number:

```bash
ls supabase/migrations/ | sort | tail -5
```

Use the next number in sequence. The plan assumes `029` but if higher migrations already exist, use the correct next number and update the filename accordingly throughout this prompt.

Create `supabase/migrations/029_add_wallet_group.sql` (or next available number):

```sql
-- Add wallet_group column to participants
-- This is the grouping tag that will replace the families table.
-- Participants with the same wallet_group share a wallet (settle as a unit).
ALTER TABLE participants ADD COLUMN wallet_group TEXT;
```

Show the migration in chat. Wait for user approval before running it.

Run it: `supabase db push` (CLI at `/usr/local/bin/supabase`).

---

### Step 3: Backfill wallet_group

Write a backfill SQL script (do NOT create a migration file for this — run it as a one-off):

```sql
-- Backfill wallet_group from families table
-- Sets wallet_group = family_name for every participant that has a family_id
UPDATE participants p
SET wallet_group = f.family_name
FROM families f
WHERE p.family_id = f.id
  AND p.wallet_group IS NULL;
```

Show it in chat. Wait for approval. Run it via `supabase` CLI or direct SQL.

---

### Step 4: Verify backfill

Run this verification query:

```sql
-- Every participant with a family_id should now have a matching wallet_group
SELECT p.id, p.name, p.family_id, p.wallet_group, f.family_name
FROM participants p
LEFT JOIN families f ON p.family_id = f.id
WHERE p.family_id IS NOT NULL
  AND (p.wallet_group IS NULL OR p.wallet_group != f.family_name);
```

This query must return **zero rows**. If it returns any rows, investigate and fix before proceeding.

Also run:

```sql
-- Confirm participants WITHOUT a family_id have NULL wallet_group (expected)
SELECT COUNT(*) as standalone_count
FROM participants
WHERE family_id IS NULL AND wallet_group IS NOT NULL;
```

This must return 0.

---

### Step 5: Update TypeScript types

Add `wallet_group` to the `Participant` interface in `src/types/participant.ts` (line 9-17):

```ts
export interface Participant {
  id: string
  trip_id: string
  family_id: string | null
  wallet_group?: string | null  // ADD THIS LINE
  name: string
  is_adult: boolean
  user_id?: string | null
  email?: string | null
}
```

Also add it to `CreateParticipantInput` and `UpdateParticipantInput`:

```ts
export interface CreateParticipantInput {
  trip_id: string
  family_id?: string | null
  wallet_group?: string | null  // ADD
  name: string
  is_adult: boolean
  email?: string | null
}

export interface UpdateParticipantInput {
  name?: string
  is_adult?: boolean
  family_id?: string | null
  wallet_group?: string | null  // ADD
  email?: string | null
}
```

---

### Step 6: Snapshot current balances

Write a script `scripts/snapshot_balances.ts` that:

1. Fetches all trips from Supabase
2. For each trip, fetches its participants, families, expenses, and settlements
3. Calls `calculateBalances()` from `src/services/balanceCalculator.ts` with the correct arguments:

```ts
calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families',  // from trip.tracking_mode
  settlements: Settlement[],
  defaultCurrency: string,  // from trip.default_currency || 'EUR'
  exchangeRates: Record<string, number>  // from trip.exchange_rates || {}
): BalanceCalculation
```

4. Outputs `balance_snapshot_pre.json` with this shape:

```json
{
  "snapshot_date": "2026-02-24T...",
  "calculator_version": "v1",
  "trips": [
    {
      "trip_id": "...",
      "trip_name": "...",
      "tracking_mode": "families",
      "balances": [
        { "id": "entity-uuid", "name": "The Smiths", "totalPaid": 500, "totalShare": 300, "balance": 200, "isFamily": true },
        ...
      ],
      "totalExpenses": 1500
    }
  ]
}
```

Show the script in chat and wait for approval before running it.

Run it and save the output to `balance_snapshot_pre.json` in the project root.

---

### Step 7: Verify

Run:
- `npm run type-check` — must pass clean
- `npm test` — all 139 tests must pass (the new `wallet_group` field is optional, so no tests should break)

---

### Step 8: Commit and update state

1. Create branch `refactor/family-phase-1-migration`
2. Commit: migration file, TypeScript type changes, snapshot script, snapshot output
3. Create PR, merge via squash
4. Update `FAMILY_REFACTOR.md`:
   - Phase 1 status → `COMPLETE`
   - PR number
   - Append to Phase Log: what was done, any issues found
5. Update `balance_snapshot_pre.json` location in the Balance Snapshot section

**Hard stop.** Phase 1 is complete. Use `PHASE_2_PROMPT.md` for the next session.
