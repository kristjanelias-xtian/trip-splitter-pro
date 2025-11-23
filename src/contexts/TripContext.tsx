import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Trip, CreateTripInput, UpdateTripInput } from '@/types/trip'
import { useStore } from '@/store/store'

interface TripContextType {
  trips: Trip[]
  loading: boolean
  error: string | null
  currentTrip: Trip | null
  createTrip: (input: CreateTripInput) => Promise<Trip | null>
  updateTrip: (id: string, input: UpdateTripInput) => Promise<boolean>
  deleteTrip: (id: string) => Promise<boolean>
  selectTrip: (tripId: string | null) => void
  refreshTrips: () => Promise<void>
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { currentTripId, setCurrentTripId } = useStore()

  // Get current trip from the list
  const currentTrip = trips.find(trip => trip.id === currentTripId) || null

  // Fetch all trips
  const fetchTrips = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setTrips((data as Trip[]) || [])

      // Auto-select first trip if none selected
      if (data && data.length > 0 && !currentTripId) {
        setCurrentTripId((data as Trip[])[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips')
      console.error('Error fetching trips:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create new trip
  const createTrip = async (input: CreateTripInput): Promise<Trip | null> => {
    try {
      setError(null)

      const { data, error: createError } = await (supabase as any)
        .from('trips')
        .insert([input])
        .select()
        .single()

      if (createError) throw createError

      const newTrip = data as Trip
      setTrips(prev => [newTrip, ...prev])
      setCurrentTripId(newTrip.id)

      return newTrip
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
      console.error('Error creating trip:', err)
      return null
    }
  }

  // Update trip
  const updateTrip = async (id: string, input: UpdateTripInput): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await (supabase as any)
        .from('trips')
        .update(input)
        .eq('id', id)

      if (updateError) throw updateError

      setTrips(prev =>
        prev.map(trip =>
          trip.id === id ? { ...trip, ...input } : trip
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip')
      console.error('Error updating trip:', err)
      return false
    }
  }

  // Delete trip
  const deleteTrip = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setTrips(prev => prev.filter(trip => trip.id !== id))

      // If deleted trip was selected, select another one
      if (currentTripId === id) {
        const remainingTrips = trips.filter(trip => trip.id !== id)
        setCurrentTripId(remainingTrips.length > 0 ? remainingTrips[0].id : null)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip')
      console.error('Error deleting trip:', err)
      return false
    }
  }

  // Select trip
  const selectTrip = (tripId: string | null) => {
    setCurrentTripId(tripId)
  }

  // Refresh trips
  const refreshTrips = async () => {
    await fetchTrips()
  }

  // Fetch trips on mount
  useEffect(() => {
    fetchTrips()
  }, [])

  const value: TripContextType = {
    trips,
    loading,
    error,
    currentTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    selectTrip,
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
