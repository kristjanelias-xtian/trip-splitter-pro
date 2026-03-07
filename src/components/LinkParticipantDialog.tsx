import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface LinkParticipantDialogProps {
  trigger?: React.ReactNode
  onLinked?: () => void
}

export function LinkParticipantDialog({ trigger, onLinked }: LinkParticipantDialogProps) {
  const { user, userProfile } = useAuth()
  const { participants, linkUserToParticipant, error, clearError } = useParticipantContext()
  const { isLinked } = useMyParticipant()
  const [open, setOpen] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  if (!user || isLinked) return null

  // Only show adults as linkable options
  const adultParticipants = participants.filter(p => p.is_adult && !p.user_id)

  const handleLink = async (participantId: string) => {
    setLinking(true)
    setLinkError(null)
    const success = await linkUserToParticipant(participantId, user.id, user.email ?? undefined, userProfile?.display_name ?? undefined)
    setLinking(false)

    if (success) {
      setOpen(false)
      onLinked?.()
    } else {
      const msg = error || 'Failed to link — please try again'
      setLinkError(msg)
      logger.error('LinkParticipantDialog: link failed', { participantId, error: msg })
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setLinkError(null)
      clearError()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserCheck size={16} />
            This is me
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Which participant are you?</DialogTitle>
          <DialogDescription>
            Link yourself to a participant so we can show your personal balance and pre-fill forms.
          </DialogDescription>
        </DialogHeader>
        {linkError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mt-2">
            <p className="text-sm font-medium text-destructive">Failed to link — please try again</p>
            <p className="text-xs text-destructive/80 mt-1">{linkError}</p>
          </div>
        )}
        <div className="space-y-2 mt-4">
          {adultParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unlinked participants available. All participants are already claimed.
            </p>
          ) : (
            adultParticipants.map(participant => (
              <button
                key={participant.id}
                onClick={() => handleLink(participant.id)}
                disabled={linking}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-accent/50 hover:border-accent transition-colors disabled:opacity-50"
              >
                <span className="font-medium">{participant.name}</span>
                {participant.wallet_group && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({participant.wallet_group})
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
