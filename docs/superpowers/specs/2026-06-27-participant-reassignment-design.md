# Participant Reassignment — Design Spec

## Overview

Add a trip-creator-only feature to **replace**, **remove**, or **add** a participant after expenses and settlements already exist, rewriting all of that participant's references atomically and showing a before/after balance preview before commit. Three user-facing actions share one engine: a pure-TS reassignment core plus a thin atomic Postgres RPC that applies a precomputed diff in a single transaction.

## Motivation

The app has no safe way to change who is on a trip once money has moved:

1. **Replacing a person is impossible in the UI.** Settlements have no edit screen at all (only create/delete), so a participant's payments can't be reassigned. Deleting a participant who is a settlement payer is rejected by a `NO ACTION` foreign key (`settlements.from_participant_id`), surfacing as a generic error.
2. **"Who inherits what" is not always one target.** A real dropout (the Krissu case) needed her *shares* to pass to the replacement (a newcomer) but her *settlements* to pass to a *third* person (her household member). A naive "swap A → B everywhere" would have mis-assigned real cash.
3. **Adding a person mid-trip recalculates nothing.** Each expense carries its own `distribution.participants[]`; adding a participant to the trip does not touch any existing expense. Retroactively including a newcomer means editing every relevant expense by hand.

All three are the same underlying operation: bulk-editing participant references across expenses and settlements, atomically, with a balance preview.

## Scope

In scope:
- Replace a participant (full handover, or drop-out with bucket-level reallocation).
- Remove a participant safely (drop-out with no replacement).
- Add a participant with optional backfill into selected existing expenses.
- Before/after balance preview on every path.
- Atomic, creator-only execution.

Out of scope (explicit non-goals):
- Per-record reallocation controls (bucket-level only; see Decisions).
- A general settlement-edit screen (the reassignment RPC is the only writer of settlement payer changes for now; a standalone editor can reuse the same primitives later).
- Modeling households / `wallet_group` relationships (the "reassign to a chosen person" option covers the household case without modeling it).
- Undo/history of reassignments beyond what git-of-data (snapshots) naturally gives; no audit log in v1.

## Design Decisions (settled in brainstorm)

| Decision | Choice |
|---|---|
| Operations | **Replace + Remove + Add-with-backfill**, one shared engine |
| Reallocation granularity | **Bucket-level** (shares / settlements / expenses-paid), not per-record |
| Permission | **Trip creator only** (`auth.uid() = trips.created_by`) |
| Execution | **Atomic server-side RPC** applying a precomputed diff; all-or-nothing |
| Business logic location | **Pure TS core**; the RPC contains no logic |
| Identity fields on replace | `user_id`, `wallet_group`, `nickname` are **never transferred**; a replacement starts unlinked |

## Architecture

Two layers: a pure core (no DB, no React) and a thin atomic writer.

### Pure core (`src/services/participantReassignment.ts`)

Operates on an in-memory **snapshot** — the trip's participants, expenses, and settlements as plain data.

```ts
type Snapshot = {
  participants: Participant[]
  expenses: Expense[]
  settlements: Settlement[]
}

// Everywhere a participant appears.
type Footprint = {
  participantId: string
  paidExpenses: Expense[]        // expenses.paid_by === id
  sharedExpenses: Expense[]      // id in distribution.participants[] (incl. participantSplits)
  settlementsFrom: Settlement[]  // from_participant_id === id
  settlementsTo: Settlement[]    // to_participant_id === id
}

function buildFootprint(snapshot: Snapshot, participantId: string): Footprint

// The user's bucket choices, resolved to concrete intent.
// Discriminated by `op` so the add-with-backfill case carries no source/buckets.
type Backfill = { expenseId: string; mode: 'equal' | 'amount'; amount?: number }

type ReassignmentPlan =
  | {
      op: 'replace' | 'remove'
      sourceId: string
      remove: boolean                          // delete source after applying
      newParticipant?: CreateParticipantInput  // when target is a brand-new person
      shares:      { kind: 'transfer'; targetId: string }
                 | { kind: 'redistribute' }    // among remaining participants of each expense
                 | { kind: 'drop' }
      settlements: { kind: 'transfer'; targetId: string }
                 | { kind: 'delete' }
      paid:        { kind: 'transfer'; targetId: string }
    }
  | {
      op: 'add'
      newParticipant: CreateParticipantInput
      backfill: Backfill[]                      // may be empty (add with no backfill)
    }

// Pure transform → a NEW snapshot with all rewrites applied. Never mutates input.
function applyPlan(snapshot: Snapshot, plan: ReassignmentPlan): Snapshot

// The diff the RPC will apply (precomputed concrete rows, no logic server-side).
type WriteDiff = {
  insertParticipant?: CreateParticipantInput & { id: string }
  updateExpenses: { id: string; paid_by?: string; distribution?: ExpenseDistribution }[]
  updateSettlements: { id: string; from_participant_id?: string; to_participant_id?: string }[]
  deleteSettlements: string[]
  deleteParticipantId?: string
}

function buildWriteDiff(snapshot: Snapshot, plan: ReassignmentPlan): WriteDiff
```

`applyPlan` and `buildWriteDiff` share one resolver so the snapshot the preview computes from is exactly the rows the RPC writes.

### Preview

Reuses the existing balance calculator unchanged:

```ts
const before = calculateBalances(snapshot, ...)
const after  = calculateBalances(applyPlan(snapshot, plan), ...)
// diff per entity → shown in the confirm step
```

No new balance math is introduced.

### Atomic writer (Postgres RPC)

`reassign_participant(p_trip_id uuid, p_diff jsonb)` — `SECURITY DEFINER`, first statement asserts `auth.uid() = (select created_by from trips where id = p_trip_id)` and raises otherwise. It iterates the precomputed `p_diff`:
- insert the new participant (if any),
- apply each expense update (`paid_by`, `distribution`),
- apply each settlement update, delete listed settlements,
- delete the source participant (if `remove`).

All inside the implicit function transaction — any failure rolls back the whole operation. The RPC contains **no business logic**: it is a dumb, ordered applier of `WriteDiff`. Deletion order (settlements/expense refs before participant delete) is honored so the existing `NO ACTION` FKs are satisfied.

> Migration note: ordering in the diff guarantees no FK violation without changing existing constraints. We do **not** add `ON DELETE CASCADE` — silent cascade is exactly the footgun this feature exists to prevent.

## User Experience

Entry point: `ParticipantsSetup` (rendered in `ManageTripPage`). Each participant row gets a "Manage member" action; the existing "Add member" affordance gains the backfill step. All three flows are gated to the trip creator (button hidden otherwise) and use `ResponsiveOverlay` (Sheet on mobile < 767px, Dialog on desktop).

### Replace
1. Pick target: **new person** (inline create) or **existing participant**.
2. Pick mode:
   - **Full handover** — all three buckets transfer to the target.
   - **Drop out & reallocate** — per-bucket destinations:
     - Shares → transfer to target / redistribute among remaining / drop.
     - Settlements → reassign to a chosen person / delete.
     - Expenses they paid → reassign payer to target or a chosen person.
3. **Balance preview** (before/after for affected entities) → confirm → one RPC call.

### Remove
Drop-out with no replacement. Shares redistribute or drop; settlements and expenses-paid **must** be reassigned to a chosen person, otherwise the confirm button is disabled with an explanation (mirrors the DB FK reality — there is no valid "orphan" state).

### Add + backfill
1. Create the person (existing add flow).
2. Optional checklist of existing expenses to retroactively join; per selected expense choose re-split **equal** or **by amount** (amount mode must keep the split summing to the expense total).
3. Preview → confirm → RPC.

## Edge Cases

- **Custom splits.** `distribution.participantSplits[].participantId` is remapped on full handover; on reallocate the source's slice is redistributed or dropped; on amount-mode backfill the resulting splits must still sum to `amount`.
- **Identity is never transferred.** `user_id`, `wallet_group`, `nickname` stay with the original record; a replacement participant is created unlinked. (Email is not transferred either.)
- **Real money cannot be redistributed.** Settlements and expenses-paid have no "redistribute" option — only transfer (or, for settlements, delete).
- **Self-targeting / no-op guards.** Target cannot equal source; an empty plan is rejected client-side before preview.
- **Source in a settlement with the target.** Allowed; the resulting self-settlement (from == to) is dropped by `applyPlan` so balances stay clean.
- **Concurrency.** The RPC reads nothing it doesn't write; the diff is computed against a snapshot fetched immediately before. A stale snapshot is acceptable for v1 (creator-only, low contention); not guarded with optimistic locking in this version.

## Testing Strategy

The pure-core + dumb-RPC split exists primarily to make this testable. Five layers, anchored on the core.

### 1. Unit tests (pure core) — `participantReassignment.test.ts`
`buildFootprint`, `applyPlan`, `buildWriteDiff` against `src/test/factories.ts` fixtures. Cover equal / percentage / amount splits, custom-split remap, redistribute, drop, all three backfill modes, and the self-settlement collapse.

### 2. Invariant / property-based tests — `fast-check`
Generate random trips + random valid plans; assert properties that must hold for **any** reassignment:
- **Conservation:** total expense amount and total settlement amount are unchanged by reference-only moves.
- **Balance-sum invariant:** the global sum of net balances is unchanged (no money created or destroyed).
- **Full-handover equivalence:** replacing A with a fresh B yields B's balance == A's old balance, every other entity unchanged.
- **Round-trip:** A→B then B→A restores original balances (clean substitute).
- **No dangling references:** after `applyPlan` with `remove`, nothing references the removed id.

### 3. RPC integration tests — real Postgres
Against a Supabase local stack or an ephemeral `create_branch`:
- Applies the full diff correctly.
- **Atomicity:** inject a mid-payload failure (e.g. an invalid expense id) → assert zero rows changed.
- **Auth:** a non-creator caller is rejected and changes nothing.
- FK ordering produces no violation on participant delete.

### 4. Contract test (preview == reality)
Seed a DB, compute `plan` in TS, call the RPC, read the rows back, assert the DB state equals `applyPlan(snapshot, plan)`. Guarantees the preview can never disagree with the executed result.

### 5. Component + E2E
- **Vitest/RTL:** the wizard — user choices map to the correct `ReassignmentPlan`/`WriteDiff` payload; the preview renders expected before/after numbers (mocked RPC).
- **Playwright:** happy-path replace / remove / add at mobile (375x812) and desktop (1280x720), Supabase mocked per the existing E2E pattern.

### New test infrastructure
- Add `fast-check` dev dependency (layer 2).
- Add a Supabase-local (or branch-based) integration harness in CI for layers 3–4. The repo currently mocks Supabase in every test, so real-Postgres integration is a genuinely new test category and needs CI wiring (compose/service for `supabase start`, or branch provisioning).

## Files (anticipated)

New:
- `src/services/participantReassignment.ts` — pure core.
- `src/services/participantReassignment.test.ts` — units + properties.
- `supabase/migrations/0XX_reassign_participant_rpc.sql` — the RPC.
- `src/components/setup/ManageMemberFlow.tsx` (or similar) — the wizard, via `ResponsiveOverlay`.
- Integration + contract test files under the chosen harness.

Modified:
- `src/components/setup/ParticipantsSetup.tsx` — "Manage member" entry, creator gating, backfill step on add.
- `src/contexts/ParticipantContext.tsx` — `reassignParticipant(tripId, plan)` calling the RPC and refreshing affected contexts.
- Possibly `src/services/balanceCalculator.ts` — only if `calculateBalances` needs a snapshot-friendly entry point (no logic change).

## Open Questions

- CI harness choice for layers 3–4: `supabase start` in CI vs ephemeral `create_branch`. Decide during planning; does not affect the application design.
- After a reassignment, which contexts must refresh (expenses, settlements, participants) and whether to refetch vs apply the known diff locally for snappier UX.
