import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Trip, CreateTripInput, UpdateTripInput } from '@/types/trip'
import { generateTripCode } from '@/lib/tripCodeGenerator'

interface TripContextType {
  trips: Trip[]
  loading: boolean
  error: string | null
  getTripById: (id: string) => Trip | undefined
  getTripByCode: (tripCode: string) => Trip | undefined
  createTrip: (input: CreateTripInput) => Promise<Trip | null>
  updateTrip: (id: string, input: UpdateTripInput) => Promise<boolean>
  deleteTrip: (id: string) => Promise<boolean>
  refreshTrips: () => Promise<void>
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all trips with timeout to prevent indefinite hang
  // (Supabase JS v2 blocks REST calls behind auth initialization which can hang)
  const fetchTrips = async () => {
    try {
      setLoading(true)
      setError(null)

      const timeoutMs = 15000
      const query = supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })

      const result = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. The server may be unavailable — please try again.')), timeoutMs)
        ),
      ])

      if (result.error) throw result.error

      setTrips((result.data as unknown as Trip[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips')
      console.error('Error fetching trips:', err)
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
  const createTrip = async (input: CreateTripInput): Promise<Trip | null> => {
    try {
      setError(null)

      // Generate trip_code if not provided
      const tripCode = input.trip_code || generateTripCode(input.name)
      const tripData = { ...input, trip_code: tripCode }

      const { data, error: createError } = await (supabase as any)
        .from('trips')
        .insert([tripData])
        .select()
        .single()

      if (createError) throw createError

      const newTrip = data as Trip
      setTrips(prev => [newTrip, ...prev])

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

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip')
      console.error('Error deleting trip:', err)
      return false
    }
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
