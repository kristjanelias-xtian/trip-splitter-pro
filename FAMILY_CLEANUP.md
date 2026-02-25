# Family Refactor Cleanup
> Date: 2026-02-25
> Branch: fix/family-refactor-cleanup
> Issues to fix: 7
> Status: COMPLETE

| # | Issue | Status | Notes |
|---|---|---|---|
| 1 | Remove Tracking Mode selector | DONE | Removed from TripForm, EventForm, ManageTripPage details + edit dialog, AdminAllTripsPage. Hardcoded `'individuals'`. Excel export updated. |
| 2 | wallet_group inline hint text | DONE | Added `text-xs text-muted-foreground mt-1` hint below wallet_group input in ParticipantsSetup.tsx |
| 3 | wallet_group changeable mid-trip | DONE | Already works — inline editor in ParticipantsSetup has no lock. `handleSaveGroup` calls `updateParticipant` directly. |
| 4 | Datalist autocomplete verification | DONE | Already implemented — `existingGroups` useMemo + `<datalist id="wallet-groups">` + `list="wallet-groups"` on both add-form and inline-edit inputs. |
| 5 | Proportional splitting → per-expense | DONE | Removed trip-level toggle from ManageTripPage. Added `accountForFamilySize` to IndividualsDistribution. Toggle in ExpenseForm + WizardStep3, only shown when wallet_group participants are selected. Calculator updated for equal-between-entities (default) vs proportional-by-size. |
| 6 | Children folded into adults in within-group balances | DONE | Calculator folds child balances into adults. UI hides children and shows "Children's shares are split among adults" note. 2 new tests added. |
| 7 | Within-group balances hidden in Quick mode | DONE | Removed from QuickGroupDetailPage. Added to SettlementsPage (Full mode) with toggle, "children's shares" note, same card pattern. |
