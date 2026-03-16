import { describe, it, expect } from 'vitest'
import { getXpForAction, getLevelForXp, getXpToNextLevel, checkWeeklyBonuses } from './xpCalculator'
import type { WalletTransaction, WalletPet } from '../types'

describe('xpCalculator', () => {
  it('awards 10 XP for logging expense', () => {
    expect(getXpForAction('log_expense')).toBe(10)
  })

  it('awards 5 XP for category correction', () => {
    expect(getXpForAction('correct_category')).toBe(5)
  })

  it('computes level from XP', () => {
    expect(getLevelForXp(0)).toBe(1)
    expect(getLevelForXp(99)).toBe(1)
    expect(getLevelForXp(100)).toBe(2)
    expect(getLevelForXp(299)).toBe(2)
    expect(getLevelForXp(300)).toBe(3)
    expect(getLevelForXp(1000)).toBe(5)
    expect(getLevelForXp(9999)).toBe(5)
  })

  it('computes XP remaining to next level', () => {
    expect(getXpToNextLevel(0)).toBe(100)
    expect(getXpToNextLevel(50)).toBe(50)
    expect(getXpToNextLevel(100)).toBe(200)
    expect(getXpToNextLevel(1000)).toBe(0)
  })

  describe('checkWeeklyBonuses', () => {
    const now = new Date('2026-03-15T12:00:00Z')
    const day = (daysAgo: number) =>
      new Date(now.getTime() - daysAgo * 86400000).toISOString()

    function tx(overrides: Partial<WalletTransaction>): WalletTransaction {
      return {
        id: crypto.randomUUID(), wallet_id: 'w1', type: 'expense',
        amount: 5, description: null, category: 'food',
        receipt_image_path: null, created_at: day(0), ...overrides,
      }
    }

    it('awards under-budget bonus when balance > 0 after full week', () => {
      const pet: WalletPet = {
        wallet_id: 'w1', name: 'Blob', level: 1, xp: 0,
        starter_emoji: '🫧', last_weekly_xp_check: day(8),
        last_streak_xp_check: null, created_at: day(30), updated_at: day(0),
      }
      const txns = [
        tx({ type: 'allowance', amount: 50, category: null, created_at: day(7) }),
        tx({ amount: 10, created_at: day(5) }),
      ]
      const bonuses = checkWeeklyBonuses(txns, pet, now)
      expect(bonuses.underBudget).toBe(50)
    })

    it('does not award under-budget if less than 7 days since allowance', () => {
      const pet: WalletPet = {
        wallet_id: 'w1', name: 'Blob', level: 1, xp: 0,
        starter_emoji: '🫧', last_weekly_xp_check: day(8),
        last_streak_xp_check: null, created_at: day(30), updated_at: day(0),
      }
      const txns = [
        tx({ type: 'allowance', amount: 50, category: null, created_at: day(3) }),
      ]
      const bonuses = checkWeeklyBonuses(txns, pet, now)
      expect(bonuses.underBudget).toBe(0)
    })

    it('awards diversity bonus for 4+ categories in a week', () => {
      const pet: WalletPet = {
        wallet_id: 'w1', name: 'Blob', level: 1, xp: 0,
        starter_emoji: '🫧', last_weekly_xp_check: day(8),
        last_streak_xp_check: null, created_at: day(30), updated_at: day(0),
      }
      const txns = [
        tx({ category: 'food', created_at: day(5) }),
        tx({ category: 'school', created_at: day(4) }),
        tx({ category: 'fun', created_at: day(3) }),
        tx({ category: 'gifts', created_at: day(2) }),
      ]
      const bonuses = checkWeeklyBonuses(txns, pet, now)
      expect(bonuses.diversity).toBe(30)
    })

    it('awards streak bonus for 7 consecutive days of logging', () => {
      const pet: WalletPet = {
        wallet_id: 'w1', name: 'Blob', level: 1, xp: 0,
        starter_emoji: '🫧', last_weekly_xp_check: null,
        last_streak_xp_check: null, created_at: day(30), updated_at: day(0),
      }
      const txns = Array.from({ length: 7 }, (_, i) =>
        tx({ category: 'food', created_at: day(i + 1) })
      )
      const bonuses = checkWeeklyBonuses(txns, pet, now)
      expect(bonuses.streak).toBe(40)
    })
  })
})
