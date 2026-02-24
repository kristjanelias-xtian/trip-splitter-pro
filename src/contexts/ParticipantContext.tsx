import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Participant,
  CreateParticipantInput,
  UpdateParticipantInput,
} from '@/types/participant'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'

interface ParticipantContextType {
  participants: Participant[]
  loading: boolean
  error: string | null
  clearError: () => void
  createParticipant: (input: CreateParticipantInput) => Promise<Participant | null>
  updateParticipant: (id: string, input: UpdateParticipantInput) => Promise<boolean>
  deleteParticipant: (id: string) => Promise<boolean>
  refreshParticipants: () => Promise<void>
  getAdultParticipants: () => Participant[]
  linkUserToParticipant: (participantId: string, userId: string) => Promise<boolean>
  unlinkUserFromParticipant: (participantId: string) => Promise<boolean>
}

const ParticipantContext = createContext<ParticipantContextType | undefined>(undefined)

export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()
  const { newSignal, cancel } = useAbortController()

  const clearError = () => setError(null)

  // Fetch participants for current trip
  const fetchData = async () => {
    const signal = newSignal()
    if (!currentTrip) {
      setParticipants([])
      setInitialLoadDone(true)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: participantsData, error: participantsError } = await withTimeout(
        supabase
          .from('participants')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('name')
          .abortSignal(signal),
        15000,
        'Loading participants timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (participantsError) throw participantsError

      setParticipants((participantsData as Participant[]) || [])
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('Error fetching participants:', err)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
  }

  // Create participant
  const createParticipant = async (input: CreateParticipantInput): Promise<Participant | null> => {
    try {
      setError(null)

      const controller = new AbortController()
      const { data, error: createError } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .insert([input])
          .select()
          .single()
          .abortSignal(controller.signal),
        15000,
        'Creating participant timed out. Please check your connection and try again.',
        controller
      )

      if (createError) throw createError

      const newParticipant = data as Participant
      setParticipants(prev => [...prev, newParticipant].sort((a, b) => a.name.localeCompare(b.name)))

      return newParticipant
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create participant')
      console.error('Error creating participant:', err)
      return null
    }
  }

  // Update participant
  const updateParticipant = async (id: string, input: UpdateParticipantInput): Promise<boolean> => {
    try {
      setError(null)

      const controller = new AbortController()
      const { error: updateError } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .update(input)
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Updating participant timed out. Please check your connection and try again.',
        controller
      )

      if (updateError) throw updateError

      setParticipants(prev =>
        prev.map(p => (p.id === id ? { ...p, ...input } : p)).sort((a, b) => a.name.localeCompare(b.name))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update participant')
      console.error('Error updating participant:', err)
      return false
    }
  }

  // Delete participant
  const deleteParticipant = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const controller = new AbortController()
      const { error: deleteError } = await withTimeout(
        supabase
          .from('participants')
          .delete()
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Deleting participant timed out. Please check your connection and try again.',
        controller
      )

      if (deleteError) throw deleteError

      setParticipants(prev => prev.filter(p => p.id !== id))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete participant')
      console.error('Error deleting participant:', err)
      return false
    }
  }

  // Link a user to a participant ("This is me")
  const linkUserToParticipant = async (participantId: string, userId: string): Promise<boolean> => {
    try {
      setError(null)

      const controller = new AbortController()
      const { error: linkError } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .update({ user_id: userId })
          .eq('id', participantId)
          .abortSignal(controller.signal),
        15000,
        'Linking user timed out. Please check your connection and try again.',
        controller
      )

      if (linkError) throw linkError

      setParticipants(prev =>
        prev.map(p => (p.id === participantId ? { ...p, user_id: userId } : p))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link user to participant')
      console.error('Error linking user to participant:', err)
      return false
    }
  }

  // Unlink a user from a participant
  const unlinkUserFromParticipant = async (participantId: string): Promise<boolean> => {
    try {
      setError(null)

      const controller = new AbortController()
      const { error: unlinkError } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .update({ user_id: null })
          .eq('id', participantId)
          .abortSignal(controller.signal),
        15000,
        'Unlinking user timed out. Please check your connection and try again.',
        controller
      )

      if (unlinkError) throw unlinkError

      setParticipants(prev =>
        prev.map(p => (p.id === participantId ? { ...p, user_id: null } : p))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink user from participant')
      console.error('Error unlinking user from participant:', err)
      return false
    }
  }

  // Refresh data
  const refreshParticipants = async () => {
    await fetchData()
  }

  // Helper: Get only adult participants
  const getAdultParticipants = () => {
    return participants.filter(p => p.is_adult)
  }

  // Fetch data when current trip changes
  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchData()
    } else {
      setParticipants([])
      setError(null)
    }
    return cancel
  }, [tripCode, currentTrip?.id])

  const value: ParticipantContextType = {
    participants,
    loading: loading || (!!currentTrip && !initialLoadDone),
    error,
    clearError,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    refreshParticipants,
    getAdultParticipants,
    linkUserToParticipant,
    unlinkUserFromParticipant,
  }

  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>
}

export function useParticipantContext() {
  const context = useContext(ParticipantContext)
  if (context === undefined) {
    throw new Error('useParticipantContext must be used within a ParticipantProvider')
  }
  return context
}
