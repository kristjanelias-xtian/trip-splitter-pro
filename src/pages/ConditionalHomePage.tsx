import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { useTripContext } from '@/contexts/TripContext'
import { HomePage } from './HomePage'

/**
 * Renders at `/` - redirects to Quick Mode if user has it set,
 * otherwise shows the original HomePage (Full Mode).
 */
export function ConditionalHomePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { mode, defaultTripId, loading: prefsLoading } = useUserPreferences()
  const { trips, loading: tripsLoading } = useTripContext()

  useEffect(() => {
    if (authLoading || prefsLoading || tripsLoading) return

    if (mode === 'quick') {
      // If user has a default trip set, go directly to that group
      if (user && defaultTripId) {
        const defaultTrip = trips.find(t => t.id === defaultTripId)
        if (defaultTrip) {
          navigate(`/t/${defaultTrip.trip_code}/quick`, { replace: true })
          return
        }
      }
      // Otherwise go to Quick home
      navigate('/quick', { replace: true })
    }
  }, [authLoading, prefsLoading, tripsLoading, user, mode, defaultTripId, trips, navigate])

  // Show Full Mode home page by default
  return <HomePage />
}
