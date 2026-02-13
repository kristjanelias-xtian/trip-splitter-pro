import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Participant,
  Family,
  CreateParticipantInput,
  CreateFamilyInput,
  UpdateParticipantInput,
  UpdateFamilyInput,
} from '@/types/participant'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'

interface ParticipantContextType {
  participants: Participant[]
  families: Family[]
  loading: boolean
  error: string | null
  createParticipant: (input: CreateParticipantInput) => Promise<Participant | null>
  updateParticipant: (id: string, input: UpdateParticipantInput) => Promise<boolean>
  deleteParticipant: (id: string) => Promise<boolean>
  createFamily: (input: CreateFamilyInput) => Promise<Family | null>
  updateFamily: (id: string, input: UpdateFamilyInput) => Promise<boolean>
  deleteFamily: (id: string) => Promise<boolean>
  refreshParticipants: () => Promise<void>
  getAdultParticipants: () => Participant[]
  getParticipantsByFamily: (familyId: string) => Participant[]
  linkUserToParticipant: (participantId: string, userId: string) => Promise<boolean>
  unlinkUserFromParticipant: (participantId: string) => Promise<boolean>
}

const ParticipantContext = createContext<ParticipantContextType | undefined>(undefined)

export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()

  // Fetch participants and families for current trip
  const fetchData = async () => {
    if (!currentTrip) {
      setParticipants([])
      setFamilies([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('name')

      if (participantsError) throw participantsError

      // Fetch families if in families mode
      if (currentTrip.tracking_mode === 'families') {
        const { data: familiesData, error: familiesError } = await supabase
          .from('families')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('family_name')

        if (familiesError) throw familiesError
        setFamilies((familiesData as Family[]) || [])
      } else {
        setFamilies([])
      }

      setParticipants((participantsData as Participant[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('Error fetching participants/families:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create participant
  const createParticipant = async (input: CreateParticipantInput): Promise<Participant | null> => {
    try {
      setError(null)

      const { data, error: createError } = await (supabase as any)
        .from('participants')
        .insert([input])
        .select()
        .single()

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

      const { error: updateError } = await (supabase as any)
        .from('participants')
        .update(input)
        .eq('id', id)

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

      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setParticipants(prev => prev.filter(p => p.id !== id))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete participant')
      console.error('Error deleting participant:', err)
      return false
    }
  }

  // Create family
  const createFamily = async (input: CreateFamilyInput): Promise<Family | null> => {
    try {
      setError(null)

      const { data, error: createError } = await (supabase as any)
        .from('families')
        .insert([input])
        .select()
        .single()

      if (createError) throw createError

      const newFamily = data as Family
      setFamilies(prev => [...prev, newFamily].sort((a, b) => a.family_name.localeCompare(b.family_name)))

      return newFamily
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create family')
      console.error('Error creating family:', err)
      return null
    }
  }

  // Update family
  const updateFamily = async (id: string, input: UpdateFamilyInput): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await (supabase as any)
        .from('families')
        .update(input)
        .eq('id', id)

      if (updateError) throw updateError

      setFamilies(prev =>
        prev.map(f => (f.id === id ? { ...f, ...input } : f)).sort((a, b) => a.family_name.localeCompare(b.family_name))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update family')
      console.error('Error updating family:', err)
      return false
    }
  }

  // Delete family
  const deleteFamily = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('families')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setFamilies(prev => prev.filter(f => f.id !== id))
      // Participants will be cascade deleted by DB

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete family')
      console.error('Error deleting family:', err)
      return false
    }
  }

  // Link a user to a participant ("This is me")
  const linkUserToParticipant = async (participantId: string, userId: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: linkError } = await (supabase as any)
        .from('participants')
        .update({ user_id: userId })
        .eq('id', participantId)

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

      const { error: unlinkError } = await (supabase as any)
        .from('participants')
        .update({ user_id: null })
        .eq('id', participantId)

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

  // Helper: Get participants by family
  const getParticipantsByFamily = (familyId: string) => {
    return participants.filter(p => p.family_id === familyId)
  }

  // Fetch data when current trip changes
  useEffect(() => {
    if (tripCode && currentTrip) {
      fetchData()
    }
  }, [tripCode, currentTrip?.id, trips.length])

  const value: ParticipantContextType = {
    participants,
    families,
    loading,
    error,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    createFamily,
    updateFamily,
    deleteFamily,
    refreshParticipants,
    getAdultParticipants,
    getParticipantsByFamily,
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
