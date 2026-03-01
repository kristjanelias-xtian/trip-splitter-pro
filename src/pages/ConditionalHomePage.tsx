import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { getActiveTripId } from '@/lib/activeTripDetection'

import { HomePage } from './HomePage'
import { Loader2 } from 'lucide-react'

/**
 * Renders at `/` — on mobile with an active trip, auto-redirects to Quick view.
 * Otherwise renders the unified HomePage.
 *
 * When navigated here with `state.fromTrip`, the auto-redirect is skipped once
 * so the user can actually reach the home page from within a trip.
 */
export function ConditionalHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { trips, loading: tripsLoading } = useTripContext()

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const fromTrip = !!(location.state as any)?.fromTrip

  useEffect(() => {
    if (!isMobile || tripsLoading) return

    // User explicitly navigated here from a trip — let them stay
    if (fromTrip) {
      window.history.replaceState({}, '')
      return
    }

    // Only auto-redirect for authenticated users. For unauthenticated users,
    // TripContext fetches ALL trips and localStorage includes shared-link trips,
    // so there's no reliable way to distinguish "my trip" from "visited via link".
    if (!user) return

    const activeTripId = getActiveTripId(trips)

    if (activeTripId) {
      const activeTrip = trips.find(t => t.id === activeTripId)
      if (activeTrip) {
        // Only redirect for trips happening right now (today within date range).
        // getActiveTripId also returns upcoming trips — don't redirect for those,
        // it's confusing when the trip is months away.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const start = new Date(activeTrip.start_date)
        const end = new Date(activeTrip.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        if (today >= start && today <= end) {
          navigate(`/t/${activeTrip.trip_code}/quick`, { replace: true })
        }
      }
    }
  }, [isMobile, tripsLoading, user, trips, navigate, fromTrip])

  if (isMobile && tripsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <HomePage />
}
