// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import {
  calculateOptimalSettlement,
  formatSettlementTransaction,
  areBalancesSettled,
  calculateTotalDebt,
  calculateTotalCredit,
  SettlementTransaction,
} from './settlementOptimizer'
import type { ParticipantBalance } from './balanceCalculator'

function balance(id: string, name: string, bal: number): ParticipantBalance {
  return { id, name, totalPaid: 0, totalShare: 0, totalSettled: 0, totalSettledSent: 0, totalSettledReceived: 0, balance: bal, isFamily: false }
}

// ─── calculateOptimalSettlement ───────────────────────────────────
describe('calculateOptimalSettlement', () => {
  it('produces no transactions when all balances are zero', () => {
    const balances = [balance('a', 'A', 0), balance('b', 'B', 0)]
    const result = calculateOptimalSettlement(balances)
    expect(result.transactions).toHaveLength(0)
    expect(result.totalTransactions).toBe(0)
  })

  it('handles 2-person settlement', () => {
    const balances = [balance('a', 'A', 50), balance('b', 'B', -50)]
    const result = calculateOptimalSettlement(balances)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].fromId).toBe('b')
    expect(result.transactions[0].toId).toBe('a')
    expect(result.transactions[0].amount).toBe(50)
  })

  it('minimizes transactions with 3 people', () => {
    // A = +60, B = -40, C = -20
    const balances = [balance('a', 'A', 60), balance('b', 'B', -40), balance('c', 'C', -20)]
    const result = calculateOptimalSettlement(balances)
    // Optimal: B pays A 40, C pays A 20 => 2 transactions
    expect(result.totalTransactions).toBe(2)
    const totalPaid = result.transactions.reduce((sum, t) => sum + t.amount, 0)
    expect(totalPaid).toBeCloseTo(60, 2)
  })

  it('handles partial match', () => {
    // A = +30, B = +20, C = -50
    const balances = [balance('a', 'A', 30), balance('b', 'B', 20), balance('c', 'C', -50)]
    const result = calculateOptimalSettlement(balances)
    const totalPaid = result.transactions.reduce((sum, t) => sum + t.amount, 0)
    expect(totalPaid).toBeCloseTo(50, 2)
  })

  it('handles exact match between debtor and creditor', () => {
    const balances = [balance('a', 'A', 100), balance('b', 'B', -100)]
    const result = calculateOptimalSettlement(balances)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].amount).toBe(100)
  })

  it('handles 4+ participants', () => {
    const balances = [
      balance('a', 'A', 100),
      balance('b', 'B', 50),
      balance('c', 'C', -80),
      balance('d', 'D', -70),
    ]
    const result = calculateOptimalSettlement(balances)
    // Total debt = 150, total credit = 150
    const totalPaid = result.transactions.reduce((sum, t) => sum + t.amount, 0)
    expect(totalPaid).toBeCloseTo(150, 2)
  })

  it('ignores balances within 0.01 tolerance', () => {
    const balances = [balance('a', 'A', 0.005), balance('b', 'B', -0.005)]
    const result = calculateOptimalSettlement(balances)
    expect(result.transactions).toHaveLength(0)
  })

  it('rounds amounts to 2 decimal places', () => {
    // Create a scenario that might produce floating point issues
    const balances = [balance('a', 'A', 33.33), balance('b', 'B', -33.33)]
    const result = calculateOptimalSettlement(balances)
    result.transactions.forEach(t => {
      const decimals = t.amount.toString().split('.')[1]?.length ?? 0
      expect(decimals).toBeLessThanOrEqual(2)
    })
  })

  it('uses provided currency', () => {
    const result = calculateOptimalSettlement([], 'USD')
    expect(result.currency).toBe('USD')
  })
})

// ─── Optimal mode (bitmask DP) ──────────────────────────────────────
describe('calculateOptimalSettlement — optimal mode', () => {
  it('finds two independent zero-sum subsets → fewer transactions', () => {
    // {A,B,C} sums to 0, {D,E} sums to 0
    // Greedy mixes them: A(-50)→E(+40)=40, D(-40)→B(+30)=30, D(-10)→C(+20)=10, A(-10)→C(+10)=10 → 4
    const balances = [
      balance('a', 'A', -50),
      balance('b', 'B', 30),
      balance('c', 'C', 20),
      balance('d', 'D', -40),
      balance('e', 'E', 40),
    ]
    const optimal = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    const greedy = calculateOptimalSettlement(balances, 'EUR', 'greedy')
    // Optimal: {A,B,C} → 2 txns + {D,E} → 1 txn = 3
    expect(optimal.totalTransactions).toBe(3)
    // Greedy crosses subsets → 4
    expect(greedy.totalTransactions).toBe(4)
  })

  it('finds three independent pairs → 3 transactions instead of 5', () => {
    const balances = [
      balance('a', 'A', 10),
      balance('b', 'B', -10),
      balance('c', 'C', 20),
      balance('d', 'D', -20),
      balance('e', 'E', 30),
      balance('f', 'F', -30),
    ]
    const optimal = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    expect(optimal.totalTransactions).toBe(3)
  })

  it('returns same count as greedy when no beneficial partition exists', () => {
    // A = +60, B = -40, C = -20  — only one zero-sum group (all of them)
    const balances = [
      balance('a', 'A', 60),
      balance('b', 'B', -40),
      balance('c', 'C', -20),
    ]
    const optimal = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    const greedy = calculateOptimalSettlement(balances, 'EUR', 'greedy')
    expect(optimal.totalTransactions).toBe(greedy.totalTransactions)
  })

  it('handles floating-point tolerance in subset sums', () => {
    // 0.1 + 0.2 - 0.3 should be treated as zero
    const balances = [
      balance('a', 'A', 0.1),
      balance('b', 'B', 0.2),
      balance('c', 'C', -0.3),
      balance('d', 'D', 5),
      balance('e', 'E', -5),
    ]
    const result = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    // {A,B,C} and {D,E} are independent
    expect(result.totalTransactions).toBe(3)
  })

  it('preserves total settlement amount after optimization', () => {
    const balances = [
      balance('a', 'A', -50),
      balance('b', 'B', 30),
      balance('c', 'C', 20),
      balance('d', 'D', -40),
      balance('e', 'E', 40),
    ]
    const result = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    const totalSettled = result.transactions.reduce((sum, t) => sum + t.amount, 0)
    // Total debt = 50 + 40 = 90
    expect(totalSettled).toBeCloseTo(90, 2)
  })

  it('greedy mode produces same results as before', () => {
    const balances = [
      balance('a', 'A', 100),
      balance('b', 'B', 50),
      balance('c', 'C', -80),
      balance('d', 'D', -70),
    ]
    const greedy = calculateOptimalSettlement(balances, 'EUR', 'greedy')
    const totalPaid = greedy.transactions.reduce((sum, t) => sum + t.amount, 0)
    expect(totalPaid).toBeCloseTo(150, 2)
    // Greedy: n-1 = 3 transactions
    expect(greedy.totalTransactions).toBe(3)
  })

  it('sorts optimal transactions by amount descending', () => {
    const balances = [
      balance('a', 'A', -50),
      balance('b', 'B', 30),
      balance('c', 'C', 20),
      balance('d', 'D', -40),
      balance('e', 'E', 40),
    ]
    const result = calculateOptimalSettlement(balances, 'EUR', 'optimal')
    for (let i = 1; i < result.transactions.length; i++) {
      expect(result.transactions[i - 1].amount).toBeGreaterThanOrEqual(result.transactions[i].amount)
    }
  })
})

// ─── formatSettlementTransaction ──────────────────────────────────
describe('formatSettlementTransaction', () => {
  it('formats transaction as readable string', () => {
    const tx: SettlementTransaction = {
      fromId: 'b',
      fromName: 'Bob',
      toId: 'a',
      toName: 'Alice',
      amount: 50,
      fromIsFamily: false,
      toIsFamily: false,
    }
    const formatted = formatSettlementTransaction(tx, 'EUR')
    expect(formatted).toContain('Bob')
    expect(formatted).toContain('Alice')
    expect(formatted).toContain('pays')
  })
})

// ─── areBalancesSettled ───────────────────────────────────────────
describe('areBalancesSettled', () => {
  it('returns true when all balances are within tolerance', () => {
    const balances = [balance('a', 'A', 0.005), balance('b', 'B', -0.005)]
    expect(areBalancesSettled(balances)).toBe(true)
  })

  it('returns false when a balance exceeds tolerance', () => {
    const balances = [balance('a', 'A', 10), balance('b', 'B', -10)]
    expect(areBalancesSettled(balances)).toBe(false)
  })

  it('returns true for empty array', () => {
    expect(areBalancesSettled([])).toBe(true)
  })
})

// ─── calculateTotalDebt / calculateTotalCredit ────────────────────
describe('calculateTotalDebt', () => {
  it('sums absolute values of negative balances', () => {
    const balances = [
      balance('a', 'A', 30),
      balance('b', 'B', -20),
      balance('c', 'C', -10),
    ]
    expect(calculateTotalDebt(balances)).toBe(30)
  })
})

describe('calculateTotalCredit', () => {
  it('sums positive balances', () => {
    const balances = [
      balance('a', 'A', 30),
      balance('b', 'B', -20),
      balance('c', 'C', 10),
    ]
    expect(calculateTotalCredit(balances)).toBe(40)
  })
})
