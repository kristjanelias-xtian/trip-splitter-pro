import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { useTripContext } from '@/contexts/TripContext'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { getMyTrips } from '@/lib/myTripsStorage'
import { HomePage } from './HomePage'
import { Loader2 } from 'lucide-react'

/**
 * Renders at `/` - redirects to Quick Mode if user has it set,
 * otherwise shows the original HomePage (Full Mode).
 *
 * In Quick Mode, auto-detects the active trip based on dates
 * and redirects directly to it.
 */
export function ConditionalHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { mode, loading: prefsLoading } = useUserPreferences()
  const { trips, loading: tripsLoading } = useTripContext()

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const shouldGoQuick = mode === 'quick' || (isMobile && mode !== 'full')

  const isLoading = prefsLoading || (shouldGoQuick && tripsLoading)

  useEffect(() => {
    if (isLoading) return
    if (!shouldGoQuick) return

    // For quick mode, auto-detect active trip from user's linked trips
    const myTripCodes = new Set(getMyTrips().map(t => t.tripCode))
    const myTrips = trips.filter(t => myTripCodes.has(t.trip_code))
    const activeTripId = getActiveTripId(myTrips)

    if (activeTripId) {
      const activeTrip = trips.find(t => t.id === activeTripId)
      if (activeTrip) {
        navigate(`/t/${activeTrip.trip_code}/quick`, { replace: true })
        return
      }
    }

    // No active trip found, show the quick home screen
    navigate('/quick', { replace: true })
  }, [isLoading, user, mode, shouldGoQuick, trips, navigate])

  // Show spinner while any context is still loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Don't render HomePage when we're about to redirect to quick mode
  if (shouldGoQuick) return null

  // Show Full Mode home page by default
  return <HomePage />
}
