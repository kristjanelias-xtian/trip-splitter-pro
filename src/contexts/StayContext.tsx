import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from './TripContext'
import type { Stay, CreateStayInput, UpdateStayInput } from '@/types/stay'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import { useAbortController } from '@/hooks/useAbortController'

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
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()
  const { newSignal, cancel } = useAbortController()

  const fetchStays = async () => {
    const signal = newSignal()
    if (!currentTrip) {
      setStays([])
      setInitialLoadDone(true)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('stays' as any) as any)
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('check_in_date', { ascending: true })
          .abortSignal(signal),
        15000,
        'Loading stays timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (error) {
        logger.error('Failed to fetch stays', { trip_id: currentTrip?.id, error: error.message })
        setStays([])
      } else {
        setStays((data as Stay[]) || [])
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch stays', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      setStays([])
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
  }

  const refreshStays = async () => {
    await fetchStays()
  }

  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchStays()
    }
    return cancel
  }, [tripCode, currentTrip?.id, trips.length])

  const createStay = async (input: CreateStayInput): Promise<Stay | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('stays' as any) as any)
          .insert([input])
          .select(),
        35000,
        'Creating stay timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to create stay', { trip_id: currentTrip?.id, error: error.message })
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
      logger.error('Failed to create stay', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const updateStay = async (
    id: string,
    input: UpdateStayInput
  ): Promise<Stay | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('stays' as any) as any)
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select(),
        35000,
        'Updating stay timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to update stay', { stay_id: id, trip_id: currentTrip?.id, error: error.message })
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
      logger.error('Failed to update stay', { stay_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const deleteStay = async (id: string): Promise<boolean> => {
    try {
      const { error } = await withTimeout<any>(
        (supabase.from('stays' as any) as any).delete().eq('id', id),
        35000,
        'Deleting stay timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to delete stay', { stay_id: id, trip_id: currentTrip?.id, error: error.message })
        return false
      }

      setStays((prev) => prev.filter((stay) => stay.id !== id))
      return true
    } catch (error) {
      logger.error('Failed to delete stay', { stay_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
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
    loading: loading || (!!currentTrip && !initialLoadDone),
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
