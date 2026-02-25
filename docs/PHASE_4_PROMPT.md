Read `FAMILY_REFACTOR.md` before doing anything else. Confirm in chat which phase you are executing and what the current phase status shows. Do not proceed if Phase 3 is not marked COMPLETE with a PR number.

---

## Phase 4 — Family Balance View

You are building the within-group balance toggle — the feature that motivated the entire refactor. This lets users see how expenses break down between members of the same wallet_group.

---

### Step 1: Read the current balance/settlement views

Read these files completely:

- `src/components/quick/QuickGroupDetailPage.tsx` — the main quick-mode trip view
- `src/components/quick/QuickBalanceHero.tsx` — the balance summary component
- `src/services/balanceCalculator.ts` — the (now V2) calculator
- `src/services/settlementOptimizer.ts` — optimizer for settlement suggestions
- `SHEET_AUDIT.md` — for bottom sheet standards

---

### Step 2: Add within-group balance calculation

In `src/services/balanceCalculator.ts`, add a new exported function:

```ts
export function calculateWithinGroupBalances(
  expenses: Expense[],
  participants: Participant[],
  walletGroup: string,
  defaultCurrency: string,
  exchangeRates: Record<string, number>
): ParticipantBalance[]
```

This function:
1. Filters participants to those in the specified `walletGroup`
2. For each expense, calculates each group member's per-person share (only expenses where group members participated)
3. Returns balances WITHIN the group only — who paid more/less than their share relative to other group members
4. If all members paid proportionally to their share → all balances are ~0 → "evenly split"

---

### Step 3: Build the within-group balance toggle

**Where it appears:** Inside `QuickGroupDetailPage.tsx`, below the main balance hero / settlement section.

**Toggle state:** `useState<boolean>(false)` — session only, not persisted. Label: "Within-group balances".

**When toggle is ON:**
- For each unique `wallet_group` in the trip's participants:
  - Show a card with the group name as header
  - List each member's within-group balance (who owes whom within the group)
  - If all within-group balances are within ±0.01: show "Evenly split ✓" in green
  - Otherwise show per-member balances (positive = overpaid, negative = underpaid)

**When the trip has no wallet_groups** (all participants have `wallet_group === null`):
- Show a muted message: "No shared wallets on this trip"
- Toggle is still visible but disabled

**Empty state** (toggle ON, but a group has no expenses):
- Show "No shared expenses yet" for that group

---

### Step 4: Handle the adults/children question

After Phase 3, the `is_adult` field still exists on participants. The within-group view shows **all** wallet_group members (adults and children). The label for each person is just their name — no adult/child distinction in the balance view.

If you need to distinguish (e.g., children don't pay), use the `is_adult` field but discuss the approach in chat before implementing.

---

### Step 5: Follow UI standards

- **Mobile (< 768px):** The toggle and group cards appear inline in the page scroll, below the main balance hero
- **Desktop (>= 768px):** Same position, cards use the full content width
- Follow the app's existing card patterns (`Card`, `CardHeader`, `CardContent` from shadcn/ui)
- Balance formatting: use `formatBalance()` and `getBalanceColorClass()` from `balanceCalculator.ts`
- No bottom sheet needed — this is inline content, not an overlay

---

### Step 6: Write tests

Add tests for `calculateWithinGroupBalances`:
- Group of 2, one paid all → imbalanced
- Group of 3, expenses split proportionally → evenly split (balances ~0)
- Group member not in any expense → zero balance
- Empty group → empty array

---

### Step 7: Verify with Playwright MCP

Take screenshots to verify the UI:
1. Mobile (375×812): toggle OFF — normal balance view
2. Mobile: toggle ON — within-group balances showing
3. Mobile: toggle ON — trip with no wallet_groups ("No shared wallets")
4. Desktop (1280×720): toggle ON — within-group balances

---

### Step 8: Final verification

1. `npm run type-check` — must pass clean
2. `npm test` — all tests pass
3. Run balance snapshot comparison one final time — zero discrepancies

---

### Step 9: Commit and update state

1. Create branch `feature/family-balance-view`
2. Commit all changes
3. Create PR
4. Update `FAMILY_REFACTOR.md`:
   - Phase 4 status → `COMPLETE`
   - PR number
   - Append to Phase Log: final summary
5. Update `PLAN.md` session log with a new entry for the family entity refactor

**Hard stop.** The family entity refactor is complete. Open the PR.
