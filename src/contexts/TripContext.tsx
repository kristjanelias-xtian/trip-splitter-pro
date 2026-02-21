import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Event, CreateEventInput, UpdateEventInput } from '@/types/trip'
import { generateTripCode } from '@/lib/tripCodeGenerator'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'

interface TripContextType {
  trips: Event[]
  loading: boolean
  error: string | null
  getTripById: (id: string) => Event | undefined
  getTripByCode: (tripCode: string) => Event | undefined
  createTrip: (input: CreateEventInput) => Promise<Event | null>
  updateTrip: (id: string, input: UpdateEventInput) => Promise<boolean>
  deleteTrip: (id: string) => Promise<boolean>
  refreshTrips: () => Promise<void>
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, user } = useAuth()
  const [trips, setTrips] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false }),
        15000,
        'Loading trips timed out. Please check your connection and try again.'
      )

      if (fetchError) throw fetchError

      setTrips((data as unknown as Event[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips')
      logger.error('Failed to fetch trips', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  // Get trip by ID
  const getTripById = (id: string) => {
    return trips.find(trip => trip.id === id)
  }

  // Get trip by code
  const getTripByCode = (tripCode: string) => {
    return trips.find(trip => trip.trip_code === tripCode)
  }

  // Create new trip
  const createTrip = async (input: CreateEventInput): Promise<Event | null> => {
    try {
      setError(null)

      // Generate trip_code if not provided
      const tripCode = input.trip_code || generateTripCode(input.name)

      // Set created_by to the current authenticated user (use cached user from context)
      const tripData = {
        ...input,
        trip_code: tripCode,
        ...(user ? { created_by: user.id } : {}),
      }

      const { data, error: createError } = await withTimeout<any>(
        (supabase as any)
          .from('trips')
          .insert([tripData])
          .select()
          .single(),
        35000,
        'Creating trip timed out. Please check your connection and try again.'
      )

      if (createError) throw createError

      const newTrip = data as Event
      setTrips(prev => [newTrip, ...prev])
      logger.info('Trip created', { trip_id: newTrip.id, name: newTrip.name })

      // Auto-link the creator as a participant — fire-and-forget so createTrip
      // returns immediately without waiting for the second DB round trip.
      if (user) {
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Me'
        ;(async () => {
          try {
            const { error: participantErr } = await supabase.from('participants').insert([{
              trip_id: newTrip.id,
              name: displayName,
              is_adult: true,
              user_id: user.id,
            }])
            if (participantErr) {
              logger.warn('Failed to auto-link creator as participant', {
                trip_id: newTrip.id,
                error: participantErr.message,
              })
            }
          } catch (participantErr) {
            logger.warn('Failed to auto-link creator as participant', {
              trip_id: newTrip.id,
              error: participantErr instanceof Error ? participantErr.message : String(participantErr),
            })
          }
        })()
      }

      return newTrip
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
      logger.error('Failed to create trip', { error: err instanceof Error ? err.message : String(err) })
      return null
    }
  }

  // Update trip
  const updateTrip = async (id: string, input: UpdateEventInput): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await withTimeout<any>(
        (supabase as any)
          .from('trips')
          .update(input)
          .eq('id', id),
        35000,
        'Updating trip timed out. Please check your connection and try again.'
      )

      if (updateError) throw updateError

      setTrips(prev =>
        prev.map(trip =>
          trip.id === id ? { ...trip, ...input } : trip
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip')
      logger.error('Failed to update trip', { trip_id: id, error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  // Delete trip
  const deleteTrip = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await withTimeout(
        supabase
          .from('trips')
          .delete()
          .eq('id', id),
        35000,
        'Deleting trip timed out. Please check your connection and try again.'
      )

      if (deleteError) throw deleteError

      setTrips(prev => prev.filter(trip => trip.id !== id))
      logger.info('Trip deleted', { trip_id: id })

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip')
      logger.error('Failed to delete trip', { trip_id: id, error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  // Refresh trips
  const refreshTrips = async () => {
    await fetchTrips()
  }

  // Fetch trips after auth has resolved or user changes
  useEffect(() => {
    if (authLoading) return
    fetchTrips()
  }, [authLoading, user?.id])

  const value: TripContextType = {
    trips,
    loading,
    error,
    getTripById,
    getTripByCode,
    createTrip,
    updateTrip,
    deleteTrip,
    refreshTrips,
  }

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTripContext() {
  const context = useContext(TripContext)
  if (context === undefined) {
    throw new Error('useTripContext must be used within a TripProvider')
  }
  return context
}
