import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  AppMode,
  getLocalPreferences,
  setLocalPreferences,
} from '@/lib/userPreferencesStorage'
import { withTimeout } from '@/lib/fetchWithTimeout'

interface UserPreferencesContextType {
  mode: AppMode
  defaultTripId: string | null
  setMode: (mode: AppMode) => Promise<void>
  setDefaultTripId: (tripId: string | null) => Promise<void>
  loading: boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [mode, setModeState] = useState<AppMode>(() => getLocalPreferences().preferredMode)
  const [defaultTripId, setDefaultTripIdState] = useState<string | null>(
    () => getLocalPreferences().defaultTripId
  )
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('trip-splitter:user-preferences')
    } catch {
      return true
    }
  })
  const hasInitialized = useRef(false)

  // Sync from Supabase when user signs in
  useEffect(() => {
    // Wait for auth to finish before deciding
    if (authLoading) return

    if (!user) {
      // No user — local preferences are authoritative, done loading
      hasInitialized.current = true
      setLoading(false)
      return
    }

    // Already fetched for this user session
    if (hasInitialized.current) return

    const fetchPreferences = async () => {
      const { data, error } = await withTimeout<any>(
        (supabase as any)
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        15000,
        'Loading preferences timed out.'
      )

      if (!error && data) {
        const serverMode = data.preferred_mode as AppMode
        const serverTripId = data.default_trip_id as string | null
        setModeState(serverMode)
        setDefaultTripIdState(serverTripId)
        setLocalPreferences({ preferredMode: serverMode, defaultTripId: serverTripId })
      }
      hasInitialized.current = true
      setLoading(false)
    }

    fetchPreferences()
  }, [user, authLoading])

  const upsertPreferences = useCallback(async (updates: Record<string, unknown>) => {
    if (!user) return
    await withTimeout<any>(
      (supabase as any)
        .from('user_preferences')
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        ),
      35000,
      'Saving preferences timed out.'
    )
  }, [user])

  const setMode = useCallback(async (newMode: AppMode) => {
    setModeState(newMode)
    setLocalPreferences({ preferredMode: newMode })
    await upsertPreferences({ preferred_mode: newMode })
  }, [upsertPreferences])

  const setDefaultTripId = useCallback(async (tripId: string | null) => {
    setDefaultTripIdState(tripId)
    setLocalPreferences({ defaultTripId: tripId })
    await upsertPreferences({ default_trip_id: tripId })
  }, [upsertPreferences])

  return (
    <UserPreferencesContext.Provider value={{ mode, defaultTripId, setMode, setDefaultTripId, loading }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}
