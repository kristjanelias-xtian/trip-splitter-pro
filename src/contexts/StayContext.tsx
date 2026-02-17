import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from './TripContext'
import type { Stay, CreateStayInput, UpdateStayInput } from '@/types/stay'

interface StayContextValue {
  stays: Stay[]
  loading: boolean
  createStay: (input: CreateStayInput) => Promise<Stay | null>
  updateStay: (id: string, input: UpdateStayInput) => Promise<Stay | null>
  deleteStay: (id: string) => Promise<boolean>
  getStayById: (id: string) => Stay | undefined
  getStayForDate: (date: string) => Stay | undefined
  getStaysForDate: (date: string) => Stay[]
  refreshStays: () => Promise<void>
}

const StayContext = createContext<StayContextValue | undefined>(undefined)

export function StayProvider({ children }: { children: ReactNode }) {
  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()

  const fetchStays = async () => {
    if (!currentTrip) {
      setStays([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await (supabase
        .from('stays' as any) as any)
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('check_in_date', { ascending: true })

      if (error) {
        console.error('Error fetching stays:', error)
        setStays([])
      } else {
        setStays((data as Stay[]) || [])
      }
    } catch (error) {
      console.error('Error fetching stays:', error)
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  const refreshStays = async () => {
    await fetchStays()
  }

  useEffect(() => {
    if (tripCode && currentTrip) {
      fetchStays()
    } else {
      setStays([])
      setLoading(false)
    }
  }, [tripCode, currentTrip?.id, trips.length])

  const createStay = async (input: CreateStayInput): Promise<Stay | null> => {
    try {
      const { data, error } = await (supabase
        .from('stays' as any) as any)
        .insert([input])
        .select()

      if (error) {
        console.error('Error creating stay:', error)
        return null
      }

      if (data?.[0]) {
        const stay = data[0] as Stay
        setStays((prev) => [...prev, stay].sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)))
        return stay
      }

      // Schema cache stale — row was inserted but .select() returned empty
      await refreshStays()
      return stays[stays.length - 1] ?? ({} as Stay)
    } catch (error) {
      console.error('Error creating stay:', error)
      return null
    }
  }

  const updateStay = async (
    id: string,
    input: UpdateStayInput
  ): Promise<Stay | null> => {
    try {
      const { data, error } = await (supabase
        .from('stays' as any) as any)
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Error updating stay:', error)
        return null
      }

      if (data?.[0]) {
        const updated = data[0] as Stay
        setStays((prev) =>
          prev
            .map((stay) => (stay.id === id ? updated : stay))
            .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
        )
        return updated
      }

      // Schema cache stale — row was updated but .select() returned empty
      await refreshStays()
      return getStayById(id) ?? ({ id, ...input } as Stay)
    } catch (error) {
      console.error('Error updating stay:', error)
      return null
    }
  }

  const deleteStay = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase.from('stays' as any) as any).delete().eq('id', id)

      if (error) {
        console.error('Error deleting stay:', error)
        return false
      }

      setStays((prev) => prev.filter((stay) => stay.id !== id))
      return true
    } catch (error) {
      console.error('Error deleting stay:', error)
      return false
    }
  }

  const getStayById = (id: string): Stay | undefined => {
    return stays.find((stay) => stay.id === id)
  }

  const getStayForDate = (date: string): Stay | undefined => {
    return stays.find((s) => s.check_in_date <= date && date < s.check_out_date)
  }

  const getStaysForDate = (date: string): Stay[] => {
    return stays.filter((s) => s.check_in_date <= date && date <= s.check_out_date)
  }

  const value: StayContextValue = {
    stays,
    loading,
    createStay,
    updateStay,
    deleteStay,
    getStayById,
    getStayForDate,
    getStaysForDate,
    refreshStays,
  }

  return <StayContext.Provider value={value}>{children}</StayContext.Provider>
}

export function useStayContext() {
  const context = useContext(StayContext)
  if (context === undefined) {
    throw new Error('useStayContext must be used within a StayProvider')
  }
  return context
}
