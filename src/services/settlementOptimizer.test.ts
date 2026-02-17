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
  return { id, name, totalPaid: 0, totalShare: 0, balance: bal, isFamily: false }
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

// ─── formatSettlementTransaction ──────────────────────────────────
describe('formatSettlementTransaction', () => {
  it('formats transaction as readable string', () => {
    const tx: SettlementTransaction = {
      fromId: 'b',
      fromName: 'Bob',
      toId: 'a',
      toName: 'Alice',
      amount: 50,
      isFromFamily: false,
      isToFamily: false,
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
