// SPDX-License-Identifier: Apache-2.0
import type { WalletTransaction, WalletPet } from '../types'
import { PET_LEVELS } from '../types'

type XpAction = 'log_expense' | 'correct_category' | 'weekly_under_budget' | 'create_savings_goal' | 'reach_savings_goal'

const XP_AWARDS: Record<XpAction, number> = {
  log_expense: 10,
  correct_category: 5,
  weekly_under_budget: 50,
  create_savings_goal: 15,
  reach_savings_goal: 100,
}

export function getXpForAction(action: XpAction): number {
  return XP_AWARDS[action]
}

export function getLevelForXp(xp: number): number {
  let level = 1
  for (const def of PET_LEVELS) {
    if (xp >= def.xpNeeded) level = def.level
  }
  return level
}

export function getXpToNextLevel(xp: number): number {
  const currentLevel = getLevelForXp(xp)
  const nextLevelDef = PET_LEVELS.find(l => l.level === currentLevel + 1)
  if (!nextLevelDef) return 0
  return nextLevelDef.xpNeeded - xp
}

export function getXpProgress(xp: number): { current: number; needed: number; percent: number } {
  const currentLevel = getLevelForXp(xp)
  const currentLevelDef = PET_LEVELS.find(l => l.level === currentLevel)!
  const nextLevelDef = PET_LEVELS.find(l => l.level === currentLevel + 1)
  if (!nextLevelDef) return { current: 0, needed: 0, percent: 100 }
  const current = xp - currentLevelDef.xpNeeded
  const needed = nextLevelDef.xpNeeded - currentLevelDef.xpNeeded
  return { current, needed, percent: Math.round((current / needed) * 100) }
}

interface WeeklyBonuses {
  underBudget: number
  diversity: number
  streak: number
}

export function checkWeeklyBonuses(
  allTransactions: WalletTransaction[],
  pet: WalletPet,
  now: Date = new Date()
): WeeklyBonuses {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const todayStr = now.toISOString().slice(0, 10)
  const result: WeeklyBonuses = { underBudget: 0, diversity: 0, streak: 0 }

  if (!pet.last_weekly_xp_check || pet.last_weekly_xp_check < todayStr) {
    const recentExpenses = allTransactions.filter(
      t => t.type === 'expense' && new Date(t.created_at) >= sevenDaysAgo
    )

    // Under budget: balance > 0 AND at least 7 days since last allowance
    const allowances = allTransactions
      .filter(t => t.type === 'allowance')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (allowances.length > 0) {
      const daysSinceAllowance = (now.getTime() - new Date(allowances[0].created_at).getTime()) / 86400000
      if (daysSinceAllowance >= 7) {
        const totalAllowance = allTransactions
          .filter(t => t.type === 'allowance')
          .reduce((s, t) => s + t.amount, 0)
        const totalExpense = allTransactions
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0)
        if (totalAllowance - totalExpense > 0) {
          result.underBudget = 50
        }
      }
    }

    // Diversity: 4+ categories in last 7 days
    const categories = new Set(recentExpenses.map(t => t.category).filter(Boolean))
    if (categories.size >= 4) {
      result.diversity = 30
    }
  }

  // Streak: 7 consecutive days (check days 1-7, yesterday backward)
  if (!pet.last_streak_xp_check || pet.last_streak_xp_check < todayStr) {
    const daySet = new Set<string>()
    for (const t of allTransactions) {
      if (t.type === 'expense') {
        daySet.add(new Date(t.created_at).toISOString().slice(0, 10))
      }
    }
    let streak = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (daySet.has(d)) streak++
      else break
    }
    if (streak >= 7) result.streak = 40
  }

  return result
}
