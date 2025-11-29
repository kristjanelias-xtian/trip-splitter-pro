/**
 * Date utility functions for meal planner
 */

export type DateContext = 'today' | 'tomorrow' | 'past' | 'future'

/**
 * Determines the context of a date relative to today
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns 'today' | 'tomorrow' | 'past' | 'future'
 */
export function getDayContext(date: string): DateContext {
  const targetDate = new Date(date)
  const today = new Date()

  // Reset time to midnight for accurate day comparison
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays < 0) return 'past'
  return 'future'
}

/**
 * Formats a date for display in day headers
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Formatted string like "Mon, Nov 23"
 */
export function formatDayHeader(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Calculates the day number relative to trip start
 * @param date - ISO date string (YYYY-MM-DD)
 * @param tripStartDate - Trip start date ISO string (YYYY-MM-DD)
 * @returns Day number (1-indexed, so first day is 1)
 */
export function getDayNumber(date: string, tripStartDate: string): number {
  const targetDate = new Date(date)
  const startDate = new Date(tripStartDate)

  // Reset time to midnight
  targetDate.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)

  const diffTime = targetDate.getTime() - startDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  return diffDays + 1 // 1-indexed
}

/**
 * Generates all dates between start and end (inclusive)
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string (YYYY-MM-DD)
 * @returns Array of ISO date strings
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}
