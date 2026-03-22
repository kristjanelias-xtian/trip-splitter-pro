import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getWeekEnd,
  calculateBudgetState,
  processCompletedWeeks,
} from './budgetCalculator'
import type { WalletTransaction, WalletSavingsEntry } from '../types'

// Helper to build a transaction
function tx(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
  return {
    id: crypto.randomUUID(),
    wallet_id: 'w1',
    type: 'expense',
    amount: 5,
    description: null,
    category: null,
    receipt_image_path: null,
    receipt_batch_id: null,
    vendor: null,
    purchase_date: null,
    purchase_group_id: null,
    created_at: '2026-03-18T10:00:00Z',
    ...overrides,
  }
}

// Helper to build a savings entry
function savings(
  overrides: Partial<WalletSavingsEntry> = {}
): WalletSavingsEntry {
  return {
    id: crypto.randomUUID(),
    wallet_id: 'w1',
    amount: 0,
    type: 'auto_save',
    description: null,
    status: 'completed',
    approved_by: null,
    week_start: null,
    created_at: '2026-03-18T10:00:00Z',
    ...overrides,
  }
}

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-03-18 is a Wednesday
    const result = getWeekStart(new Date('2026-03-18'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-16')
  })

  it('returns same day for a Monday', () => {
    // 2026-03-16 is a Monday
    const result = getWeekStart(new Date('2026-03-16'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-16')
  })

  it('returns previous Monday for a Sunday', () => {
    // 2026-03-22 is a Sunday
    const result = getWeekStart(new Date('2026-03-22'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-16')
  })
})

describe('getWeekEnd', () => {
  it('returns Sunday for a Monday', () => {
    const result = getWeekEnd(new Date('2026-03-16'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-22')
  })

  it('returns same Sunday for a Sunday', () => {
    const result = getWeekEnd(new Date('2026-03-22'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-22')
  })
})

describe('calculateBudgetState', () => {
  // Current week: Mon 2026-03-16 to Sun 2026-03-22
  const now = new Date('2026-03-18T12:00:00Z') // Wednesday

  it('returns full budget with no spending', () => {
    const state = calculateBudgetState(10, '2026-03-16', [], [], now)
    expect(state.effectiveBudget).toBe(10)
    expect(state.weekSpending).toBe(0)
    expect(state.weeklyRemaining).toBe(10)
    expect(state.debt).toBe(0)
    expect(state.totalSavings).toBe(0)
    expect(state.currentWeekStart.toISOString().slice(0, 10)).toBe('2026-03-16')
    expect(state.currentWeekEnd.toISOString().slice(0, 10)).toBe('2026-03-22')
  })

  it('subtracts current week spending', () => {
    const transactions = [
      tx({ amount: 3, purchase_date: '2026-03-17' }),
      tx({ amount: 2, purchase_date: '2026-03-18' }),
    ]
    const state = calculateBudgetState(10, '2026-03-16', transactions, [], now)
    expect(state.weekSpending).toBe(5)
    expect(state.weeklyRemaining).toBe(5)
  })

  it('reflects auto-save surplus from completed weeks via savings entries', () => {
    // Budget started a week earlier, so week 2026-03-09..15 is completed
    // Kid spent 6 of 10, so 4 was auto-saved
    const transactions = [
      tx({ amount: 6, purchase_date: '2026-03-10' }),
    ]
    const savingsEntries = [
      savings({ amount: 4, type: 'auto_save', week_start: '2026-03-09' }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-09', transactions, savingsEntries, now
    )
    expect(state.totalSavings).toBe(4)
    expect(state.debt).toBe(0)
    expect(state.effectiveBudget).toBe(10)
  })

  it('carries debt from overspending', () => {
    // Previous week: spent 15 of 10 budget, overspent by 5
    // No savings to deduct from, so debt = 5
    const transactions = [
      tx({ amount: 15, purchase_date: '2026-03-10' }),
    ]
    const savingsEntries = [
      savings({ amount: -5, type: 'overspend', week_start: '2026-03-09' }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-09', transactions, savingsEntries, now
    )
    expect(state.debt).toBe(5)
    expect(state.effectiveBudget).toBe(5) // 10 - 5 debt
    expect(state.weeklyRemaining).toBe(5)
  })

  it('deducts overspend from savings first', () => {
    // Week 1 (03-02..08): spent 5 of 10, saved 5
    // Week 2 (03-09..15): spent 13 of 10, overspent 3 — deducted from savings
    // Net savings: 5 - 3 = 2, debt = 0
    const transactions = [
      tx({ amount: 5, purchase_date: '2026-03-03' }),
      tx({ amount: 13, purchase_date: '2026-03-10' }),
    ]
    const savingsEntries = [
      savings({ amount: 5, type: 'auto_save', week_start: '2026-03-02' }),
      savings({ amount: -3, type: 'overspend', week_start: '2026-03-09' }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-02', transactions, savingsEntries, now
    )
    expect(state.totalSavings).toBe(2)
    expect(state.debt).toBe(0)
    expect(state.effectiveBudget).toBe(10)
  })

  it('includes approved withdrawals in spending balance', () => {
    // totalSavings had 10 from previous weeks, kid withdraws 5 (approved)
    const savingsEntries = [
      savings({ amount: 10, type: 'auto_save', week_start: '2026-03-09' }),
      savings({
        amount: -5, type: 'withdrawal', status: 'completed',
        week_start: '2026-03-16',
      }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-09', [], savingsEntries, now
    )
    expect(state.totalSavings).toBe(5)
    expect(state.weeklyRemaining).toBe(15) // 10 budget + 5 withdrawal
  })

  it('ignores pending withdrawals', () => {
    const savingsEntries = [
      savings({ amount: 10, type: 'auto_save', week_start: '2026-03-09' }),
      savings({
        amount: -5, type: 'withdrawal', status: 'pending_approval',
        week_start: '2026-03-16',
      }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-09', [], savingsEntries, now
    )
    expect(state.totalSavings).toBe(10) // pending not counted
    expect(state.weeklyRemaining).toBe(10) // no withdrawal boost
  })

  it('only counts current week expenses for weekSpending', () => {
    const transactions = [
      tx({ amount: 7, purchase_date: '2026-03-10' }), // previous week
      tx({ amount: 3, purchase_date: '2026-03-17' }), // current week
    ]
    const state = calculateBudgetState(10, '2026-03-09', transactions, [], now)
    expect(state.weekSpending).toBe(3)
  })

  it('uses created_at when purchase_date is null', () => {
    const transactions = [
      tx({
        amount: 4,
        purchase_date: null,
        created_at: '2026-03-17T15:00:00Z', // current week (Tue)
      }),
      tx({
        amount: 2,
        purchase_date: null,
        created_at: '2026-03-10T15:00:00Z', // previous week
      }),
    ]
    const state = calculateBudgetState(10, '2026-03-09', transactions, [], now)
    expect(state.weekSpending).toBe(4) // only the current-week one
  })

  it('maintains balance invariant: allowances - expenses = weeklyRemaining + totalSavings', () => {
    // 3 completed weeks at 10/week = 30 total allowance
    // Spent: 5 + 8 + 6 = 19
    // Savings from completed: (10-5)=5, (10-8)=2 → total auto_save = 7
    // Current week spending = 6
    // weeklyRemaining = 10 - 6 = 4
    // totalSavings = 7
    // allowances(30) - expenses(19) = 11 = weeklyRemaining(4) + totalSavings(7) ✓
    const transactions = [
      tx({ amount: 5, purchase_date: '2026-03-03' }),
      tx({ amount: 8, purchase_date: '2026-03-10' }),
      tx({ amount: 6, purchase_date: '2026-03-17' }),
    ]
    const savingsEntries = [
      savings({ amount: 5, type: 'auto_save', week_start: '2026-03-02' }),
      savings({ amount: 2, type: 'auto_save', week_start: '2026-03-09' }),
    ]
    const state = calculateBudgetState(
      10, '2026-03-02', transactions, savingsEntries, now
    )

    const weeksElapsed = 3 // 03-02, 03-09, 03-16
    const totalAllowance = weeksElapsed * 10
    const totalExpenses = 5 + 8 + 6
    expect(totalAllowance - totalExpenses).toBe(
      state.weeklyRemaining + state.totalSavings
    )
  })
})

describe('processCompletedWeeks', () => {
  it('returns auto_save entry for surplus week', () => {
    // Week 03-09..15 completed, spent 6 of 10
    const now = new Date('2026-03-16T12:00:00Z') // Monday of new week
    const transactions = [
      tx({ amount: 6, purchase_date: '2026-03-10' }),
    ]
    const result = processCompletedWeeks(10, '2026-03-09', transactions, [], now)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('auto_save')
    expect(result[0].amount).toBe(4)
    expect(result[0].week_start).toBe('2026-03-09')
  })

  it('returns overspend entry for over-budget week', () => {
    const now = new Date('2026-03-16T12:00:00Z')
    const transactions = [
      tx({ amount: 15, purchase_date: '2026-03-10' }),
    ]
    const result = processCompletedWeeks(10, '2026-03-09', transactions, [], now)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('overspend')
    expect(result[0].amount).toBe(-5)
    expect(result[0].week_start).toBe('2026-03-09')
  })

  it('skips weeks that already have savings entries', () => {
    const now = new Date('2026-03-16T12:00:00Z')
    const transactions = [
      tx({ amount: 6, purchase_date: '2026-03-10' }),
    ]
    const existingSavings = [
      savings({ amount: 4, type: 'auto_save', week_start: '2026-03-09' }),
    ]
    const result = processCompletedWeeks(
      10, '2026-03-09', transactions, existingSavings, now
    )
    expect(result).toHaveLength(0)
  })

  it('handles multi-week catch-up', () => {
    // Budget started 3 weeks ago, none processed yet
    const now = new Date('2026-03-23T12:00:00Z') // Monday of week 4
    // Week 3 has no spending at all
    const txs = [
      tx({ amount: 3, purchase_date: '2026-03-03' }),
      tx({ amount: 12, purchase_date: '2026-03-10' }),
    ]
    const result = processCompletedWeeks(10, '2026-03-02', txs, [], now)
    expect(result).toHaveLength(3)

    // Week 1 (03-02): spent 3, save 7
    expect(result[0].week_start).toBe('2026-03-02')
    expect(result[0].type).toBe('auto_save')
    expect(result[0].amount).toBe(7)

    // Week 2 (03-09): spent 12, overspend 2
    expect(result[1].week_start).toBe('2026-03-09')
    expect(result[1].type).toBe('overspend')
    expect(result[1].amount).toBe(-2)

    // Week 3 (03-16): spent 0, save 10
    expect(result[2].week_start).toBe('2026-03-16')
    expect(result[2].type).toBe('auto_save')
    expect(result[2].amount).toBe(10)
  })
})
