import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
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
  const { user } = useAuth()
  const { participants, families, linkUserToParticipant } = useParticipantContext()
  const { isLinked } = useMyParticipant()
  const [open, setOpen] = useState(false)
  const [linking, setLinking] = useState(false)

  if (!user || isLinked) return null

  // Only show adults as linkable options
  const adultParticipants = participants.filter(p => p.is_adult && !p.user_id)

  const handleLink = async (participantId: string) => {
    setLinking(true)
    const success = await linkUserToParticipant(participantId, user.id)
    setLinking(false)

    if (success) {
      setOpen(false)
      onLinked?.()
    }
  }

  const getFamilyName = (familyId: string | null) => {
    if (!familyId) return null
    return families.find(f => f.id === familyId)?.family_name || null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <div className="space-y-2 mt-4">
          {adultParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unlinked participants available. All participants are already claimed.
            </p>
          ) : (
            adultParticipants.map(participant => {
              const familyName = getFamilyName(participant.family_id)
              return (
                <button
                  key={participant.id}
                  onClick={() => handleLink(participant.id)}
                  disabled={linking}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-accent/50 hover:border-accent transition-colors disabled:opacity-50"
                >
                  <span className="font-medium">{participant.name}</span>
                  {familyName && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({familyName})
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
