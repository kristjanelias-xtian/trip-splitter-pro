import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { addToMyTrips } from '@/lib/myTripsStorage'

export function useCurrentTrip() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const { getTripByCode, loading, ensureTripLoaded } = useTripContext()
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const fallbackAttempted = useRef<string | null>(null)

  const currentTrip = tripCode ? getTripByCode(tripCode) : null

  // Synchronously determine if a fallback fetch is needed — must be computed
  // during render (not in an effect) so TripRouteGuard sees loading=true
  // immediately and doesn't redirect to trip-not-found in the same cycle.
  const shouldFallback = !loading && !!tripCode && !currentTrip
    && fallbackAttempted.current !== tripCode

  // Fallback: if trip not in local array (authenticated user viewing someone else's trip),
  // fetch it directly by trip_code — URL is the access token
  useEffect(() => {
    if (shouldFallback && tripCode) {
      fallbackAttempted.current = tripCode
      setFallbackLoading(true)
      ensureTripLoaded(tripCode).finally(() => setFallbackLoading(false))
    }
  }, [shouldFallback, tripCode])

  // Automatically add trip to "My Trips" when accessed
  useEffect(() => {
    if (currentTrip && tripCode) {
      addToMyTrips(tripCode, currentTrip.name)
    }
  }, [currentTrip, tripCode])

  return {
    currentTrip,
    tripCode,
    loading: loading || fallbackLoading || shouldFallback,
  }
}
