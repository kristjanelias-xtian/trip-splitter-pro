// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Participant,
  CreateParticipantInput,
  UpdateParticipantInput,
} from '@/types/participant'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import { logger } from '@/lib/logger'

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
  linkUserToParticipant: (participantId: string, userId: string, userEmail?: string, displayName?: string) => Promise<boolean>
  unlinkUserFromParticipant: (participantId: string) => Promise<boolean>
}

const ParticipantContext = createContext<ParticipantContextType | undefined>(undefined)

export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()
  const { user, userProfile } = useAuth()
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

      // Enrich linked participants with avatar_url from user_profiles
      const enriched = (participantsData as Participant[]) || []
      const linkedUserIds = enriched.filter(p => p.user_id).map(p => p.user_id!)
      if (linkedUserIds.length > 0) {
        const { data: profiles } = await withTimeout<any>(
          (supabase as any).from('user_profiles').select('id, avatar_url').in('id', linkedUserIds).abortSignal(signal),
          15000, 'Loading profiles timed out.'
        )
        if (!signal.aborted && profiles) {
          const avatarMap = new Map((profiles as { id: string; avatar_url: string | null }[]).map(p => [p.id, p.avatar_url]))
          enriched.forEach(p => {
            if (p.user_id) p.avatar_url = avatarMap.get(p.user_id) ?? null
          })
        }
      }

      setParticipants(enriched)
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
  const linkUserToParticipant = async (participantId: string, userId: string, userEmail?: string, displayName?: string): Promise<boolean> => {
    try {
      setError(null)

      const updatePayload: Record<string, unknown> = { user_id: userId }
      if (userEmail) updatePayload.email = userEmail
      if (displayName) {
        updatePayload.name = displayName
        // Preserve original name as nickname when overwriting with Google name
        const existing = participants.find(p => p.id === participantId)
        if (existing && !existing.nickname && existing.name !== displayName) {
          updatePayload.nickname = existing.name
        }
      }

      const controller = new AbortController()
      const { error: linkError } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .update(updatePayload)
          .eq('id', participantId)
          .abortSignal(controller.signal),
        15000,
        'Linking user timed out. Please check your connection and try again.',
        controller
      )

      let emailApplied = !!userEmail
      if (linkError) {
        // If email unique constraint violation, retry without email
        const isEmailConflict = linkError.message?.includes('participants_trip_email_unique') ||
          linkError.code === '23505'
        if (isEmailConflict && userEmail) {
          logger.warn('linkUserToParticipant: email conflict, retrying without email', { participantId, userEmail })
          emailApplied = false
          const retryPayload: Record<string, unknown> = { user_id: userId }
          if (displayName) {
            retryPayload.name = displayName
            const existing = participants.find(p => p.id === participantId)
            if (existing && !existing.nickname && existing.name !== displayName) {
              retryPayload.nickname = existing.name
            }
          }
          const retryController = new AbortController()
          const { error: retryError } = await withTimeout<any>(
            (supabase as any)
              .from('participants')
              .update(retryPayload)
              .eq('id', participantId)
              .abortSignal(retryController.signal),
            15000,
            'Linking user timed out. Please check your connection and try again.',
            retryController
          )
          if (retryError) throw retryError
        } else {
          throw linkError
        }
      }

      setParticipants(prev =>
        prev.map(p => {
          if (p.id !== participantId) return p
          const updates: Partial<Participant> = { user_id: userId }
          if (emailApplied) updates.email = userEmail
          if (displayName) {
            updates.name = displayName
            if (!p.nickname && p.name !== displayName) {
              updates.nickname = p.name
            }
          }
          return { ...p, ...updates }
        }).sort((a, b) => a.name.localeCompare(b.name))
      )

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to link user to participant'
      setError(msg)
      logger.error('linkUserToParticipant failed', { participantId, userId, error: msg })
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

  // Background sync: keep linked participant's name/email in sync with Google profile
  const bgSyncDoneRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user || !userProfile?.display_name || participants.length === 0) return

    const myParticipant = participants.find(p => p.user_id === user.id)
    if (!myParticipant) return

    const nameStale = myParticipant.name !== userProfile.display_name
    const emailStale = user.email && myParticipant.email !== user.email

    if (!nameStale && !emailStale) return

    // Prevent re-firing for the same participant while update is in flight
    const syncKey = `${myParticipant.id}:${userProfile.display_name}:${user.email}`
    if (bgSyncDoneRef.current === syncKey) return
    bgSyncDoneRef.current = syncKey

    updateParticipant(myParticipant.id, {
      ...(nameStale ? { name: userProfile.display_name } : {}),
      // Preserve original name as nickname when background sync overwrites name
      ...(nameStale && !myParticipant.nickname && myParticipant.name !== userProfile.display_name
        ? { nickname: myParticipant.name } : {}),
      ...(emailStale ? { email: user.email! } : {}),
    })
  }, [participants, userProfile?.display_name, user?.email])

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
