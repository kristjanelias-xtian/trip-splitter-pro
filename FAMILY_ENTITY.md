# Family Entity Audit

_Audited 2026-02-24_

## What "family" means

A family = a group of people who **share one wallet** for the trip. They settle as a unit, not individually. Use cases: couples, parents + kids, friends sharing all costs.

This mental model is **never explained in the UI**. Current labels: "Individuals + Families" / "Track at family level with individual breakdowns" — meaningless to a first-time user.

---

## Complexity footprint

| Metric | Value |
|--------|-------|
| Files touching family logic | **44** |
| Total family-related references in `src/` | **536** |
| `FamiliesSetup.tsx` | **906 lines** (vs 349 for IndividualsSetup — 2.6x) |
| Distribution types in expense JSONB | **3** (individuals, families, mixed) |
| "CRITICAL: avoid double-counting" comments | **5** |
| Per-expense decisions families mode adds | **2** (which families + account for size toggle) |

### Heaviest files

| File | Family refs | Lines | Family % |
|------|-----------|-------|----------|
| `balanceCalculator.ts` | 92 | 503 | 18% |
| `ExpenseSplitPreview.tsx` | 58 | 374 | 16% |
| `ExpenseForm.tsx` | 52 | ~1000 | 5% |
| `balanceCalculator.test.ts` | 57 | ~420 | 14% |
| `ExpenseWizard.tsx` | 23 | ~600 | 4% |
| `QuickSettlementSheet.tsx` | 23 | ~200 | 12% |

---

## UX issues

### 1. No explanation of when to use families

The tracking mode selector (`TripForm.tsx:188-231`) shows two radio options with no guidance. A user doesn't know what "Track at family level" means until they've used it. The "same wallet" concept is intuitive — it just needs to be surfaced.

### 2. Tracking mode is permanently locked

`disableTrackingMode` (`TripForm.tsx:190`) prevents changing the mode after adding participants. If someone picks wrong, they must delete all participants and start over. No escape hatch.

### 3. Three checkbox lists when splitting an expense

In families mode, the expense form (`ExpenseForm.tsx:706-823`) and mobile wizard (`WizardStep3.tsx`) show:
1. **Families** — checkboxes for family units
2. **Standalone Individuals** — people not in any family
3. **All Individuals** — everyone, including people already covered by family checkboxes

The same person appears in two lists. The code needs 5 deduplication guards to prevent double-counting. If the system needs that many guardrails, the UI model is wrong.

### 4. "Account for family size" is per-expense

The `accountForFamilySize` toggle (`WizardStep3.tsx:122-146`) appears on **every** expense. In practice, a trip group either wants proportional splitting or equal splitting — they don't toggle this per dinner bill. This should be a trip-level setting, not a per-expense decision.

### 5. Five concepts users must understand

To use families mode, a user needs to grasp:
1. "Family" = shared wallet (not explained)
2. The tracking mode choice is permanent (warned but not explained why)
3. Family entities vs individual people are different selection targets
4. Selecting a family implicitly covers its members (double-counting risk)
5. "Account for family size" changes how costs are split

---

## Architecture issue: parallel entity model

The root cause of code complexity: families are a **separate entity type**, not a grouping tag on participants.

### Current model (parallel entities)

```
families table
  id UUID ← used in expense distribution JSONB
  family_name, adults, children

participants table
  id UUID
  family_id UUID ← FK to families (nullable)
```

- Expense `distribution` JSONB stores `families: string[]` (family IDs)
- Balance calculator maps between participant IDs and family entity IDs
- 3 distribution types: `individuals`, `families`, `mixed`
- "Mixed" exists ONLY because families mode can have standalone participants
- Every component that touches money branches on `if (trackingMode === 'families')`

### Alternative model (grouping tag)

```
participants table
  id UUID
  wallet_group TEXT ← nullable label, e.g. "The Smiths"
```

- Expenses only reference participant IDs (one distribution type)
- Balance calculation groups by `wallet_group` at display time
- No "mixed" type needed, no double-counting logic
- ~1,350 fewer lines, 44 files → ~35

### Why the refactor is non-trivial

- Existing expense data with `distribution.type === 'families'` or `'mixed'` needs migration
- Settlement optimizer currently works with family entity IDs
- `adults`/`children` counts on families would need to be derived from participant metadata
- Requires data migration strategy for production trips

---

## Potential improvements (if/when we act)

### Quick wins (UX only)
- Add explanation text: _"Use when some people share money and don't need to settle between themselves — e.g., a couple or parents with kids"_
- Rename "Individuals + Families" → "Shared wallets" or "Some people share money"
- Move `accountForFamilySize` to trip settings (removes 33 refs across 7 files)

### Medium effort
- Unify the 3-list expense split UI into one grouped list
- Allow converting between tracking modes after participants exist

### Major refactor
- Migrate from parallel entity model to grouping-tag model
- Eliminate `mixed` distribution type
- Merge `FamiliesSetup.tsx` + `IndividualsSetup.tsx` into one component
