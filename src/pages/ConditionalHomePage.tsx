import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { getMyTrips } from '@/lib/myTripsStorage'
import { HomePage } from './HomePage'
import { Loader2 } from 'lucide-react'

/**
 * Renders at `/` — on mobile with an active trip, auto-redirects to Quick view.
 * Otherwise renders the unified HomePage.
 */
export function ConditionalHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trips, loading: tripsLoading } = useTripContext()

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    if (!isMobile || tripsLoading) return

    const myTrips = user
      ? trips
      : trips.filter(t => new Set(getMyTrips().map(e => e.tripCode)).has(t.trip_code))
    const activeTripId = getActiveTripId(myTrips)

    if (activeTripId) {
      const activeTrip = trips.find(t => t.id === activeTripId)
      if (activeTrip) {
        navigate(`/t/${activeTrip.trip_code}/quick`, { replace: true })
      }
    }
  }, [isMobile, tripsLoading, user, trips, navigate])

  if (isMobile && tripsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <HomePage />
}
