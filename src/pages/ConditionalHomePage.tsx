import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { useTripContext } from '@/contexts/TripContext'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { getMyTrips } from '@/lib/myTripsStorage'
import { HomePage } from './HomePage'

/**
 * Renders at `/` - redirects to Quick Mode if user has it set,
 * otherwise shows the original HomePage (Full Mode).
 *
 * In Quick Mode, auto-detects the active trip based on dates
 * and redirects directly to it.
 */
export function ConditionalHomePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { mode, loading: prefsLoading } = useUserPreferences()
  const { trips, loading: tripsLoading } = useTripContext()

  useEffect(() => {
    if (authLoading || prefsLoading || tripsLoading) return
    if (mode !== 'quick') return

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
  }, [authLoading, prefsLoading, tripsLoading, user, mode, trips, navigate])

  // Don't render HomePage when we're about to redirect to quick mode
  if (mode === 'quick') return null

  // Show Full Mode home page by default
  return <HomePage />
}
