import type { WalletTransaction, MoodResult, MoodTier } from '../types'

function balanceHealthSignal(transactions: WalletTransaction[], now: Date): number {
  const allowances = transactions.filter((t) => t.type === 'allowance')
  if (allowances.length === 0) return 0.5

  // Find most recent allowance
  const lastAllowance = allowances.reduce((latest, t) =>
    new Date(t.created_at) > new Date(latest.created_at) ? t : latest
  )

  const totalAllowance = allowances.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalAllowance - totalExpenses
  const ratio = balance / lastAllowance.amount

  const daysSinceAllowance =
    (now.getTime() - new Date(lastAllowance.created_at).getTime()) / 86400000

  // Thresholds relax linearly from day 3 to day 7
  // Day 0-3: goodThreshold=0.5, badThreshold=0.1
  // Day 7+:  goodThreshold=0.2, badThreshold=0.0
  let goodThreshold: number
  let badThreshold: number

  if (daysSinceAllowance <= 3) {
    goodThreshold = 0.5
    badThreshold = 0.1
  } else {
    const t = Math.min((daysSinceAllowance - 3) / 4, 1) // 0..1 over days 3..7
    goodThreshold = 0.5 - t * (0.5 - 0.2) // 0.5 → 0.2
    badThreshold = 0.1 - t * 0.1           // 0.1 → 0.0
  }

  if (ratio >= goodThreshold) return 1
  if (ratio <= badThreshold) return 0

  // Linear interpolation between bad and good thresholds
  return (ratio - badThreshold) / (goodThreshold - badThreshold)
}

function categoryDiversitySignal(transactions: WalletTransaction[], now: Date): number {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const recentExpenses = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.created_at) >= sevenDaysAgo
  )

  if (recentExpenses.length === 0) return 0.5

  const categoryCounts = new Map<string, number>()
  for (const t of recentExpenses) {
    const cat = t.category ?? 'other'
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + t.amount)
  }

  const categoryCount = categoryCounts.size

  if (categoryCount >= 3) return 1

  const totalAmount = recentExpenses.reduce((sum, t) => sum + t.amount, 0)
  const maxAmount = Math.max(...categoryCounts.values())
  const concentration = totalAmount > 0 ? maxAmount / totalAmount : 1

  if (concentration >= 0.8) return 0

  return Math.min(categoryCount / 3, 1)
}

function loggingConsistencySignal(transactions: WalletTransaction[], now: Date): number {
  // No transactions at all → neutral default
  if (transactions.length === 0) return 0.5

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const recentExpenses = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.created_at) >= sevenDaysAgo
  )

  if (recentExpenses.length === 0) return 0

  // Check if latest entry is 3+ days ago
  const latestExpense = recentExpenses.reduce((latest, t) =>
    new Date(t.created_at) > new Date(latest.created_at) ? t : latest
  )
  const daysSinceLatest =
    (now.getTime() - new Date(latestExpense.created_at).getTime()) / 86400000

  if (daysSinceLatest >= 3) return 0

  const uniqueDays = new Set(
    recentExpenses.map((t) => new Date(t.created_at).toISOString().slice(0, 10))
  )

  return Math.min(uniqueDays.size / 5, 1)
}

function scoreToTier(score: number): MoodTier {
  if (score >= 0.7) return 'ecstatic'
  if (score > 0.5) return 'happy'
  if (score >= 0.3) return 'neutral'
  return 'worried'
}

export function calculateMood(transactions: WalletTransaction[], now: Date): MoodResult {
  const balanceHealth = balanceHealthSignal(transactions, now)
  const categoryDiversity = categoryDiversitySignal(transactions, now)
  const loggingConsistency = loggingConsistencySignal(transactions, now)

  const score = (balanceHealth + categoryDiversity + loggingConsistency) / 3
  const tier = scoreToTier(score)

  return {
    score,
    tier,
    signals: {
      balanceHealth,
      categoryDiversity,
      loggingConsistency,
    },
  }
}
