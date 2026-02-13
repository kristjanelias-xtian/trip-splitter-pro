import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  AppMode,
  getLocalPreferences,
  setLocalPreferences,
} from '@/lib/userPreferencesStorage'

interface UserPreferencesContextType {
  mode: AppMode
  defaultTripId: string | null
  setMode: (mode: AppMode) => Promise<void>
  setDefaultTripId: (tripId: string | null) => Promise<void>
  loading: boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [mode, setModeState] = useState<AppMode>(() => getLocalPreferences().preferredMode)
  const [defaultTripId, setDefaultTripIdState] = useState<string | null>(
    () => getLocalPreferences().defaultTripId
  )
  const [loading, setLoading] = useState(false)

  // Sync from Supabase when user signs in
  useEffect(() => {
    if (!user) return

    const fetchPreferences = async () => {
      setLoading(true)
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!error && data) {
        const serverMode = data.preferred_mode as AppMode
        const serverTripId = data.default_trip_id as string | null
        setModeState(serverMode)
        setDefaultTripIdState(serverTripId)
        setLocalPreferences({ preferredMode: serverMode, defaultTripId: serverTripId })
      }
      setLoading(false)
    }

    fetchPreferences()
  }, [user])

  const upsertPreferences = useCallback(async (updates: Record<string, unknown>) => {
    if (!user) return
    await (supabase as any)
      .from('user_preferences')
      .upsert(
        { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
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
