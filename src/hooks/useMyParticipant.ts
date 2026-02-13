import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'

/**
 * Finds the current authenticated user's participant record in the current trip.
 * Returns null if user is not authenticated or not linked to any participant.
 */
export function useMyParticipant() {
  const { user } = useAuth()
  const { participants } = useParticipantContext()

  if (!user) return { myParticipant: null, isLinked: false }

  const myParticipant = participants.find(p => p.user_id === user.id) || null

  return {
    myParticipant,
    isLinked: myParticipant !== null,
  }
}
