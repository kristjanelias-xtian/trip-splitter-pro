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

  // Fast path: redirect unauthenticated quick-mode users immediately
  // (no need to wait for trips to load)
  useEffect(() => {
    if (authLoading || prefsLoading) return

    if (mode === 'quick' && (!user || !defaultTripId)) {
      navigate('/quick', { replace: true })
    }
  }, [authLoading, prefsLoading, user, mode, defaultTripId, navigate])

  // Default-trip shortcut: authenticated quick-mode users with a default trip
  useEffect(() => {
    if (authLoading || prefsLoading || tripsLoading) return

    if (mode === 'quick' && user && defaultTripId) {
      const defaultTrip = trips.find(t => t.id === defaultTripId)
      if (defaultTrip) {
        navigate(`/t/${defaultTrip.trip_code}/quick`, { replace: true })
      } else {
        // Default trip not found, fall back to quick home
        navigate('/quick', { replace: true })
      }
    }
  }, [authLoading, prefsLoading, tripsLoading, user, mode, defaultTripId, trips, navigate])

  // Don't render HomePage when we're about to redirect to quick mode
  if (mode === 'quick') return null

  // Show Full Mode home page by default
  return <HomePage />
}
