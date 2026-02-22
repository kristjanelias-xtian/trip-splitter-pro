import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import type { Activity, CreateActivityInput, UpdateActivityInput } from '@/types/activity'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import { useAbortController } from '@/hooks/useAbortController'

interface ActivityContextValue {
  activities: Activity[]
  loading: boolean
  createActivity: (input: CreateActivityInput) => Promise<Activity | null>
  updateActivity: (id: string, input: UpdateActivityInput) => Promise<Activity | null>
  deleteActivity: (id: string) => Promise<boolean>
  getActivityById: (id: string) => Activity | undefined
  getActivitiesForDate: (date: string) => Activity[]
  refreshActivities: () => Promise<void>
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined)

const TIME_SLOT_ORDER = { morning: 0, afternoon: 1, evening: 2 }

function sortActivities(a: Activity, b: Activity): number {
  const dateCompare = a.activity_date.localeCompare(b.activity_date)
  if (dateCompare !== 0) return dateCompare
  return (TIME_SLOT_ORDER[a.time_slot] ?? 0) - (TIME_SLOT_ORDER[b.time_slot] ?? 0)
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const { currentTrip, tripCode } = useCurrentTrip()
  const { newSignal, cancel } = useAbortController()

  const fetchActivities = async () => {
    const signal = newSignal()
    if (!currentTrip) {
      setActivities([])
      setInitialLoadDone(true)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('activities' as any) as any)
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('activity_date', { ascending: true })
          .abortSignal(signal),
        15000,
        'Loading activities timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (error) {
        logger.error('Failed to fetch activities', { trip_id: currentTrip?.id, error: error.message })
        setActivities([])
      } else {
        setActivities(((data as Activity[]) || []).sort(sortActivities))
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch activities', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      setActivities([])
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
  }

  const refreshActivities = async () => {
    await fetchActivities()
  }

  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchActivities()
    }
    return cancel
  }, [tripCode, currentTrip?.id])

  const createActivity = async (input: CreateActivityInput): Promise<Activity | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('activities' as any) as any)
          .insert([input])
          .select()
          .single(),
        35000,
        'Creating activity timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to create activity', { trip_id: currentTrip?.id, error: error.message })
        return null
      }

      setActivities((prev) => [...prev, data as Activity].sort(sortActivities))
      return data as Activity
    } catch (error) {
      logger.error('Failed to create activity', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const updateActivity = async (
    id: string,
    input: UpdateActivityInput
  ): Promise<Activity | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('activities' as any) as any)
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single(),
        35000,
        'Updating activity timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to update activity', { activity_id: id, trip_id: currentTrip?.id, error: error.message })
        return null
      }

      setActivities((prev) =>
        prev
          .map((activity) => (activity.id === id ? data : activity))
          .sort(sortActivities)
      )

      return data
    } catch (error) {
      logger.error('Failed to update activity', { activity_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await withTimeout<any>(
        (supabase.from('activities' as any) as any).delete().eq('id', id),
        35000,
        'Deleting activity timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to delete activity', { activity_id: id, trip_id: currentTrip?.id, error: error.message })
        return false
      }

      setActivities((prev) => prev.filter((activity) => activity.id !== id))
      return true
    } catch (error) {
      logger.error('Failed to delete activity', { activity_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  const getActivityById = (id: string): Activity | undefined => {
    return activities.find((activity) => activity.id === id)
  }

  const getActivitiesForDate = (date: string): Activity[] => {
    return activities.filter((activity) => activity.activity_date === date)
  }

  const value: ActivityContextValue = {
    activities,
    loading: loading || (!!currentTrip && !initialLoadDone),
    createActivity,
    updateActivity,
    deleteActivity,
    getActivityById,
    getActivitiesForDate,
    refreshActivities,
  }

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivityContext() {
  const context = useContext(ActivityContext)
  if (context === undefined) {
    throw new Error('useActivityContext must be used within an ActivityProvider')
  }
  return context
}
