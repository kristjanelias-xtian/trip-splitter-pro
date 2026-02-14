import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from './TripContext'
import type { Activity, CreateActivityInput, UpdateActivityInput } from '@/types/activity'

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
  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()

  const fetchActivities = async () => {
    if (!currentTrip) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await (supabase
        .from('activities' as any) as any)
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('activity_date', { ascending: true })

      if (error) {
        console.error('Error fetching activities:', error)
        setActivities([])
      } else {
        setActivities(((data as Activity[]) || []).sort(sortActivities))
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const refreshActivities = async () => {
    await fetchActivities()
  }

  useEffect(() => {
    if (tripCode && currentTrip) {
      fetchActivities()
    } else {
      setActivities([])
      setLoading(false)
    }
  }, [tripCode, currentTrip?.id, trips.length])

  const createActivity = async (input: CreateActivityInput): Promise<Activity | null> => {
    try {
      const { data, error } = await (supabase
        .from('activities' as any) as any)
        .insert([input])
        .select()
        .single()

      if (error) {
        console.error('Error creating activity:', error)
        return null
      }

      setActivities((prev) => [...prev, data as Activity].sort(sortActivities))
      return data as Activity
    } catch (error) {
      console.error('Error creating activity:', error)
      return null
    }
  }

  const updateActivity = async (
    id: string,
    input: UpdateActivityInput
  ): Promise<Activity | null> => {
    try {
      const { data, error } = await (supabase
        .from('activities' as any) as any)
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating activity:', error)
        return null
      }

      setActivities((prev) =>
        prev
          .map((activity) => (activity.id === id ? data : activity))
          .sort(sortActivities)
      )

      return data
    } catch (error) {
      console.error('Error updating activity:', error)
      return null
    }
  }

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase.from('activities' as any) as any).delete().eq('id', id)

      if (error) {
        console.error('Error deleting activity:', error)
        return false
      }

      setActivities((prev) => prev.filter((activity) => activity.id !== id))
      return true
    } catch (error) {
      console.error('Error deleting activity:', error)
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
    loading,
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
