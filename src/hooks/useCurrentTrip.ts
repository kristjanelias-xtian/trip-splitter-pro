import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { addToMyTrips } from '@/lib/myTripsStorage'

export function useCurrentTrip() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const { getTripByCode, loading, ensureTripLoaded } = useTripContext()
  const [fallbackLoading, setFallbackLoading] = useState(false)

  const currentTrip = tripCode ? getTripByCode(tripCode) : null

  // Fallback: if trip not in local array (authenticated user viewing someone else's trip),
  // fetch it directly by trip_code — URL is the access token
  useEffect(() => {
    if (tripCode && !currentTrip && !loading) {
      setFallbackLoading(true)
      ensureTripLoaded(tripCode).finally(() => setFallbackLoading(false))
    }
  }, [tripCode, !currentTrip, loading])

  // Automatically add trip to "My Trips" when accessed
  useEffect(() => {
    if (currentTrip && tripCode) {
      addToMyTrips(tripCode, currentTrip.name)
    }
  }, [currentTrip, tripCode])

  return {
    currentTrip,
    tripCode,
    loading: loading || fallbackLoading,
  }
}
