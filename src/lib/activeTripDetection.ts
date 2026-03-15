// SPDX-License-Identifier: Apache-2.0
import { Trip } from '@/types/trip'
import { ParticipantBalance, SETTLED_THRESHOLD } from '@/services/balanceCalculator'

export type TripPhase = 'upcoming' | 'active' | 'ended'

/**
 * Determine the current phase of a trip based on its dates.
 * A trip is "active" on both its start_date and end_date (inclusive).
 * It becomes "ended" the day after end_date.
 */
export function getTripPhase(trip: Trip): TripPhase {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(trip.start_date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(trip.end_date)
  end.setHours(23, 59, 59, 999)

  if (today > end) return 'ended'
  if (today >= start) return 'active'
  return 'upcoming'
}

/**
 * Auto-detect the "active" trip based on dates:
 * 1. Today falls within start_date..end_date → that trip (if multiple, pick the one ending soonest)
 * 2. No active trip → pick the next upcoming trip (nearest future start_date)
 * 3. No upcoming → null (show trip list)
 */
export function getActiveTripId(trips: Trip[]): string | null {
  if (trips.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find trips that are currently active (today is within start_date..end_date)
  const activeTrips = trips.filter(trip => {
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return today >= start && today <= end
  })

  if (activeTrips.length > 0) {
    // Pick the one ending soonest
    activeTrips.sort((a, b) =>
      new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    )
    return activeTrips[0].id
  }

  // No active trip - find the next upcoming trip
  const upcomingTrips = trips.filter(trip => {
    const start = new Date(trip.start_date)
    start.setHours(0, 0, 0, 0)
    return start > today
  })

  if (upcomingTrips.length > 0) {
    upcomingTrips.sort((a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )
    return upcomingTrips[0].id
  }

  return null
}

/**
 * Sort trip-balance entries by relevance:
 *   0 – Active (today in start..end), tiebreak: end_date ASC (ending soonest first)
 *   1 – Upcoming (start > today), tiebreak: start_date ASC (nearest first)
 *   2 – Ended + unsettled balance, tiebreak: end_date DESC (most recent first)
 *   3 – Ended + settled / no balance, tiebreak: end_date DESC (most recent first)
 */
export function sortTripBalances<T extends { trip: Trip; myBalance: ParticipantBalance | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const pa = getSortPriority(a)
    const pb = getSortPriority(b)
    if (pa !== pb) return pa - pb

    const phase = getTripPhase(a.trip)
    if (phase === 'active') {
      // ending soonest first
      return new Date(a.trip.end_date).getTime() - new Date(b.trip.end_date).getTime()
    }
    if (phase === 'upcoming') {
      // nearest start first
      return new Date(a.trip.start_date).getTime() - new Date(b.trip.start_date).getTime()
    }
    // ended: most recent first
    return new Date(b.trip.end_date).getTime() - new Date(a.trip.end_date).getTime()
  })
}

function isUnsettled(balance: ParticipantBalance | null): boolean {
  return balance !== null && Math.abs(balance.balance) > SETTLED_THRESHOLD
}

function getSortPriority(item: { trip: Trip; myBalance: ParticipantBalance | null }): number {
  const phase = getTripPhase(item.trip)
  if (phase === 'active') return 0
  if (phase === 'upcoming') return 1
  if (phase === 'ended' && isUnsettled(item.myBalance)) return 2
  return 3
}
