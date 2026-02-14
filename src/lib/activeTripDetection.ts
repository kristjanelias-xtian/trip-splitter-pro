import { Trip } from '@/types/trip'

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
