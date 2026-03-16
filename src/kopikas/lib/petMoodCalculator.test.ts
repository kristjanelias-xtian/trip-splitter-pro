import { describe, it, expect } from 'vitest'
import { calculateMood } from './petMoodCalculator'
import type { WalletTransaction } from '../types'

const now = new Date('2026-03-15T12:00:00Z')
const day = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86400000).toISOString()

function tx(overrides: Partial<WalletTransaction>): WalletTransaction {
  return {
    id: crypto.randomUUID(),
    wallet_id: 'w1',
    type: 'expense',
    amount: 5,
    description: null,
    category: 'food',
    receipt_image_path: null,
    created_at: day(0),
    ...overrides,
  }
}

describe('calculateMood', () => {
  it('returns neutral (0.5) when no transactions', () => {
    const result = calculateMood([], now)
    expect(result.tier).toBe('neutral')
    expect(result.score).toBeCloseTo(0.5, 1)
  })

  it('returns ecstatic with good balance, diverse categories, consistent logging', () => {
    const allowance = tx({ type: 'allowance', amount: 50, category: null, created_at: day(6) })
    const expenses = [
      tx({ amount: 5, category: 'food', created_at: day(5) }),
      tx({ amount: 3, category: 'school', created_at: day(4) }),
      tx({ amount: 2, category: 'fun', created_at: day(3) }),
      tx({ amount: 4, category: 'gifts', created_at: day(2) }),
      tx({ amount: 1, category: 'sweets', created_at: day(1) }),
    ]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.tier).toBe('ecstatic')
    expect(result.score).toBeGreaterThanOrEqual(0.7)
  })

  it('returns worried when balance is low early and single category', () => {
    const allowance = tx({ type: 'allowance', amount: 20, category: null, created_at: day(1) })
    const expenses = [
      tx({ amount: 19, category: 'sweets', created_at: day(0) }),
    ]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.tier).toBe('worried')
    expect(result.score).toBeLessThan(0.3)
  })

  it('balance health defaults to 0.5 when no allowance exists', () => {
    const expenses = [tx({ amount: 10, category: 'food', created_at: day(1) })]
    const result = calculateMood(expenses, now)
    expect(result.signals.balanceHealth).toBeCloseTo(0.5)
  })

  it('returns happy tier for moderate scores', () => {
    const allowance = tx({ type: 'allowance', amount: 30, category: null, created_at: day(6) })
    const expenses = [
      tx({ amount: 10, category: 'food', created_at: day(4) }),
      tx({ amount: 5, category: 'fun', created_at: day(2) }),
    ]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.tier).toBe('happy')
  })

  it('interpolates balance health after day 3 (spending down expected)', () => {
    const allowance = tx({ type: 'allowance', amount: 50, category: null, created_at: day(7) })
    const expenses = [tx({ amount: 40, category: 'food', created_at: day(6) })]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.signals.balanceHealth).toBeGreaterThanOrEqual(0.8)
  })

  it('logging consistency scores 0 when no entries for 3+ days', () => {
    const allowance = tx({ type: 'allowance', amount: 20, category: null, created_at: day(6) })
    const expenses = [tx({ amount: 5, category: 'food', created_at: day(5) })]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.signals.loggingConsistency).toBe(0)
  })

  it('category diversity returns ~0.67 for 2 balanced categories', () => {
    const allowance = tx({ type: 'allowance', amount: 50, category: null, created_at: day(6) })
    const expenses = [
      tx({ amount: 5, category: 'food', created_at: day(1) }),
      tx({ amount: 5, category: 'fun', created_at: day(1) }),
    ]
    const result = calculateMood([allowance, ...expenses], now)
    expect(result.signals.categoryDiversity).toBeCloseTo(0.67, 1)
  })
})
