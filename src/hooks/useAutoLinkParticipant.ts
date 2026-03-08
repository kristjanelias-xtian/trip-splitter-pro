// SPDX-License-Identifier: Apache-2.0
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

/**
 * Auto-links the authenticated user to a participant if their email
 * matches exactly one unlinked adult participant. Silent operation
 * with a toast on success.
 */
export function useAutoLinkParticipant(): { autoLinked: boolean } {
  const { user, userProfile } = useAuth()
  const { participants, loading, linkUserToParticipant } = useParticipantContext()
  const { currentTrip } = useCurrentTrip()
  const { toast } = useToast()
  const [autoLinked, setAutoLinked] = useState(false)
  const attemptedForTripRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentTrip?.id) {
      attemptedForTripRef.current = null
      setAutoLinked(false)
      return
    }

    if (attemptedForTripRef.current === currentTrip.id) return
    if (!user?.email) return
    if (loading || participants.length === 0) return

    // Already linked to this trip
    if (participants.some(p => p.user_id === user.id)) return

    attemptedForTripRef.current = currentTrip.id

    const userEmailLower = user.email.toLowerCase()
    const matches = participants.filter(
      p => p.email?.toLowerCase() === userEmailLower && !p.user_id && p.is_adult
    )

    if (matches.length !== 1) return

    const match = matches[0]
    const displayName = userProfile?.display_name ?? undefined

    linkUserToParticipant(match.id, user.id, user.email, displayName).then(success => {
      if (success) {
        setAutoLinked(true)
        toast({
          title: 'You\'ve been linked!',
          description: `Linked as ${match.nickname || match.name}`,
        })
        logger.info('Auto-linked participant by email match', {
          participantId: match.id,
          tripId: currentTrip.id,
        })
      }
    })
  }, [user, userProfile, participants, loading, currentTrip, linkUserToParticipant, toast])

  return { autoLinked }
}
