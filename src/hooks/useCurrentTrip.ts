import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { addToMyTrips } from '@/lib/myTripsStorage'

export function useCurrentTrip() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const { getTripByCode, loading } = useTripContext()

  const currentTrip = tripCode ? getTripByCode(tripCode) : null

  // Automatically add trip to "My Trips" when accessed
  useEffect(() => {
    if (currentTrip && tripCode) {
      addToMyTrips(tripCode, currentTrip.name)
    }
  }, [currentTrip, tripCode])

  return {
    currentTrip,
    tripCode,
    loading,
  }
}
