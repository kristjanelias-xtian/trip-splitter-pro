// SPDX-License-Identifier: Apache-2.0

import type {
  BudgetState,
  WalletTransaction,
  WalletSavingsEntry,
} from '../types'

/**
 * Returns the YYYY-MM-DD date string for a transaction,
 * using purchase_date if available, otherwise created_at.
 */
function getTransactionDate(t: WalletTransaction): string {
  return t.purchase_date ?? t.created_at.slice(0, 10)
}

/**
 * Returns Monday (00:00 UTC) of the week containing the given date.
 * Uses ISO week convention: Monday = 1, Sunday = 7.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return d
}

/**
 * Returns Sunday (00:00 UTC) of the week containing the given date.
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  start.setUTCDate(start.getUTCDate() + 6)
  return start
}

/**
 * Format a Date as YYYY-MM-DD string (UTC).
 */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Parse a YYYY-MM-DD string to a Date at 00:00 UTC.
 */
function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00Z')
}

/**
 * Sum expenses for a given week (identified by weekStartKey YYYY-MM-DD).
 * Only counts transactions with type === 'expense'.
 */
function weekExpenses(
  transactions: WalletTransaction[],
  weekStartKey: string
): number {
  const weekStart = parseDate(weekStartKey)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const weekEndKey = toDateKey(weekEnd)

  let total = 0
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const dateKey = getTransactionDate(t)
    if (dateKey >= weekStartKey && dateKey <= weekEndKey) {
      total += t.amount
    }
  }
  return total
}

/**
 * Pure function that computes the current budget state from all inputs.
 *
 * @param weeklyAmount - The weekly allowance amount
 * @param startDate - YYYY-MM-DD when budget tracking began
 * @param transactions - All wallet transactions
 * @param savingsEntries - All savings ledger entries
 * @param now - Current time
 */
export function calculateBudgetState(
  weeklyAmount: number,
  _startDate: string,
  transactions: WalletTransaction[],
  savingsEntries: WalletSavingsEntry[],
  now: Date
): BudgetState {
  const currentWeekStart = getWeekStart(now)
  const currentWeekEnd = getWeekEnd(now)
  const currentWeekStartKey = toDateKey(currentWeekStart)

  // Calculate totalSavings and debt from savings entries
  // Only count completed entries; pending_approval are ignored
  let totalSavings = 0
  let currentWeekWithdrawals = 0

  for (const entry of savingsEntries) {
    if (entry.status !== 'completed') continue

    totalSavings += entry.amount // auto_save is positive, overspend/withdrawal is negative

    // Track approved withdrawals in current week for spending boost
    if (
      entry.type === 'withdrawal' &&
      entry.week_start === currentWeekStartKey
    ) {
      currentWeekWithdrawals += Math.abs(entry.amount)
    }
  }

  // Debt: if totalSavings is negative, that's debt
  const debt = totalSavings < 0 ? Math.abs(totalSavings) : 0
  if (totalSavings < 0) totalSavings = 0

  // Effective budget for this week = weekly allowance minus debt
  const effectiveBudget = weeklyAmount - debt

  // Current week spending
  const weekSpending = weekExpenses(transactions, currentWeekStartKey)

  // Weekly remaining = effective budget - current spending + approved withdrawals
  const weeklyRemaining =
    effectiveBudget - weekSpending + currentWeekWithdrawals

  return {
    effectiveBudget,
    weekSpending,
    weeklyRemaining,
    debt,
    totalSavings,
    currentWeekStart,
    currentWeekEnd,
  }
}

/**
 * Determines new savings entries to insert for completed weeks.
 * Returns entries that should be inserted into the savings ledger.
 *
 * For each completed week from startDate to currentWeekStart:
 * - If week already has an entry in existingSavings, skip
 * - If surplus (weekly_amount > spending), create auto_save
 * - If overspend (spending > weekly_amount), create overspend
 * - If exact, skip (amount would be 0)
 */
export function processCompletedWeeks(
  weeklyAmount: number,
  startDate: string,
  transactions: WalletTransaction[],
  existingSavings: WalletSavingsEntry[],
  now: Date
): Array<{ type: 'auto_save' | 'overspend'; amount: number; week_start: string }> {
  const currentWeekStart = getWeekStart(now)
  const currentWeekStartKey = toDateKey(currentWeekStart)

  // Build set of week_starts that already have entries
  const processedWeeks = new Set<string>()
  for (const entry of existingSavings) {
    if (entry.week_start) {
      processedWeeks.add(entry.week_start)
    }
  }

  const results: Array<{
    type: 'auto_save' | 'overspend'
    amount: number
    week_start: string
  }> = []

  // Iterate from startDate week to the week before current
  let weekStart = getWeekStart(parseDate(startDate))
  let weekStartKey = toDateKey(weekStart)

  while (weekStartKey < currentWeekStartKey) {
    if (!processedWeeks.has(weekStartKey)) {
      const spending = weekExpenses(transactions, weekStartKey)
      const remainder = weeklyAmount - spending

      if (remainder > 0) {
        results.push({
          type: 'auto_save',
          amount: remainder,
          week_start: weekStartKey,
        })
      } else if (remainder < 0) {
        results.push({
          type: 'overspend',
          amount: remainder, // negative
          week_start: weekStartKey,
        })
      }
      // remainder === 0: no entry needed
    }

    // Advance to next week
    weekStart = new Date(weekStart)
    weekStart.setUTCDate(weekStart.getUTCDate() + 7)
    weekStartKey = toDateKey(weekStart)
  }

  return results
}
