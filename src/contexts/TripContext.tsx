import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Event, CreateEventInput, UpdateEventInput } from '@/types/trip'
import { generateTripCode } from '@/lib/tripCodeGenerator'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import { getMyTrips } from '@/lib/myTripsStorage'

interface TripContextType {
  trips: Event[]
  loading: boolean
  error: string | null
  getTripById: (id: string) => Event | undefined
  getTripByCode: (tripCode: string) => Event | undefined
  ensureTripLoaded: (tripCode: string) => Promise<Event | null>
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
  const { newSignal, cancel } = useAbortController()

  const fetchTrips = async () => {
    const signal = newSignal()
    setLoading(true)
    setError(null)
    try {
      if (!user) {
        // Anonymous: fetch all trips so URL-based access (/t/:tripCode) keeps working
        const { data, error: fetchError } = await withTimeout(
          supabase.from('trips').select('*').order('created_at', { ascending: false }).abortSignal(signal),
          15000,
          'Loading trips timed out. Please check your connection and try again.'
        )
        if (signal.aborted) return
        if (fetchError) throw fetchError
        setTrips((data as unknown as Event[]) || [])
        return
      }

      // Authenticated: scope to trips where user is creator OR participant
      // Run both participant lookups in parallel (user_id link + email match)
      const [participantResult, emailResult] = await Promise.all([
        withTimeout(
          supabase.from('participants').select('trip_id').eq('user_id', user.id).abortSignal(signal),
          10000,
          'Loading trip membership timed out.'
        ),
        user.email
          ? withTimeout(
              supabase.from('participants').select('trip_id')
                .ilike('email', user.email)
                .is('user_id', null)
                .abortSignal(signal),
              10000,
              'Loading email-matched trips timed out.'
            )
          : Promise.resolve({ data: [], error: null } as { data: { trip_id: string }[] | null; error: any }),
      ])
      if (signal.aborted) return
      if (participantResult.error) throw participantResult.error

      if (emailResult.error) {
        logger.warn('Failed to fetch email-matched trips', { error: emailResult.error.message })
      }

      const participantTripIds = (participantResult.data ?? []).map((r: any) => r.trip_id as string)
      const emailTripIds = (emailResult.data ?? []).map((r: any) => r.trip_id as string)
      const allTripIds = [...new Set([...participantTripIds, ...emailTripIds])]

      const filter = allTripIds.length > 0
        ? `created_by.eq.${user.id},id.in.(${allTripIds.join(',')})`
        : `created_by.eq.${user.id}`

      if (signal.aborted) return

      const { data, error: fetchError } = await withTimeout(
        supabase.from('trips').select('*').or(filter).order('created_at', { ascending: false }).abortSignal(signal),
        15000,
        'Loading trips timed out. Please check your connection and try again.'
      )
      if (signal.aborted) return
      if (fetchError) throw fetchError
      const fetchedTrips = (data as unknown as Event[]) || []
      setTrips(fetchedTrips)

      // Merge localStorage trips that weren't returned by the DB query.
      // This covers trips visited via shared link where the user isn't creator or participant.
      const fetchedCodes = new Set(fetchedTrips.map(t => t.trip_code))
      const localTrips = getMyTrips()
      const missingCodes = localTrips
        .map(t => t.tripCode)
        .filter(code => !fetchedCodes.has(code))

      if (missingCodes.length > 0) {
        const extras = await Promise.all(
          missingCodes.map(async (code) => {
            if (signal.aborted) return null
            try {
              const { data: trip } = await withTimeout<any>(
                (supabase as any).from('trips').select('*').eq('trip_code', code).maybeSingle().abortSignal(signal),
                15000, 'Loading shared trip timed out.'
              )
              return trip as Event | null
            } catch { return null }
          })
        )
        const valid = extras.filter((t): t is Event => t !== null)
        if (valid.length > 0 && !signal.aborted) {
          setTrips(prev => {
            const ids = new Set(prev.map(t => t.id))
            return [...prev, ...valid.filter(t => !ids.has(t.id))]
          })
        }
      }
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch trips')
      logger.error('Failed to fetch trips', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
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

  // Fetch a single trip by code and add it to the local array.
  // Used when an authenticated user navigates to a trip they didn't create
  // and aren't a participant of — URL is the access token.
  const ensureTripLoaded = async (tripCode: string): Promise<Event | null> => {
    const existing = trips.find(t => t.trip_code === tripCode)
    if (existing) return existing

    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase as any).from('trips').select('*').eq('trip_code', tripCode).maybeSingle().abortSignal(newSignal()),
        15000,
        'Loading trip timed out.'
      )
      if (fetchError) throw fetchError
      if (!data) return null

      const trip = data as unknown as Event
      setTrips(prev => {
        if (prev.some(t => t.id === trip.id)) return prev
        return [...prev, trip]
      })
      return trip
    } catch (err) {
      logger.error('Failed to fetch trip by code', { tripCode, error: err instanceof Error ? err.message : String(err) })
      return null
    }
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

      const controller = new AbortController()
      const { data, error: createError } = await withTimeout<any>(
        (supabase as any)
          .from('trips')
          .insert([tripData])
          .select()
          .single()
          .abortSignal(controller.signal),
        15000,
        'Creating trip timed out. Please check your connection and try again.',
        controller
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
              email: user.email || null,
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

      const controller = new AbortController()
      const { error: updateError } = await withTimeout<any>(
        (supabase as any)
          .from('trips')
          .update(input)
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Updating trip timed out. Please check your connection and try again.',
        controller
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

      const controller = new AbortController()
      const { error: deleteError } = await withTimeout(
        supabase
          .from('trips')
          .delete()
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Deleting trip timed out. Please check your connection and try again.',
        controller
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
    setTrips([])  // Clear immediately on user change to prevent stale data flash
    fetchTrips()
    return cancel
  }, [authLoading, user?.id])

  const value: TripContextType = {
    trips,
    loading,
    error,
    getTripById,
    getTripByCode,
    ensureTripLoaded,
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
