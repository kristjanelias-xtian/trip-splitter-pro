import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Mail, Pencil, Check } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fadeInUp } from '@/lib/animations'
import type { Participant } from '@/types/participant'
import { logger } from '@/lib/logger'

interface IndividualsSetupProps {
  onComplete?: () => void
  hasSetup?: boolean
}

async function sendInvitation(params: {
  participantId: string
  participantEmail: string
  participantName: string
  tripId: string
  tripCode: string
  tripName: string
  organiserName: string
  inviterId: string
}) {
  try {
    // Create invitation row
    const { data: inv, error: invError } = await supabase
      .from('invitations')
      .insert([{
        trip_id: params.tripId,
        participant_id: params.participantId,
        inviter_id: params.inviterId,
      }])
      .select('id, token')
      .single()

    if (invError || !inv) {
      logger.warn('Failed to create invitation row', { error: String(invError) })
      return
    }

    // Fire-and-forget: send email
    supabase.functions.invoke('send-email', {
      body: {
        type: 'invitation',
        invitation_id: inv.id,
        trip_name: params.tripName,
        trip_code: params.tripCode,
        participant_name: params.participantName,
        participant_email: params.participantEmail,
        organiser_name: params.organiserName,
        token: inv.token,
      },
    }).then(({ error }) => {
      if (error) logger.warn('send-email edge fn returned error', { error: String(error) })
    })
  } catch (err) {
    logger.warn('sendInvitation: unhandled error', { error: String(err) })
  }
}

export function IndividualsSetup({ onComplete: _onComplete, hasSetup: _hasSetup = false }: IndividualsSetupProps = {}) {
  const { currentTrip } = useCurrentTrip()
  const { participants, createParticipant, updateParticipant, deleteParticipant } = useParticipantContext()
  const { user, userProfile } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isAdult, setIsAdult] = useState(true)
  const [adding, setAdding] = useState(false)

  // Per-participant inline email editing
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null)

  const organiserName = userProfile?.display_name || user?.email?.split('@')[0] || 'Organiser'

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()

    if (!currentTrip || !name.trim()) return

    setAdding(true)
    try {
      const newParticipant = await createParticipant({
        trip_id: currentTrip.id,
        name: name.trim(),
        is_adult: isAdult,
        family_id: null,
        email: email.trim() || null,
      })
      setName('')
      setEmail('')
      setIsAdult(true)

      // Send invitation if email provided
      if (newParticipant && email.trim() && user) {
        sendInvitation({
          participantId: newParticipant.id,
          participantEmail: email.trim(),
          participantName: newParticipant.name,
          tripId: currentTrip.id,
          tripCode: currentTrip.trip_code,
          tripName: currentTrip.name,
          organiserName,
          inviterId: user.id,
        })
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this participant?')) {
      await deleteParticipant(id)
    }
  }

  const handleStartEditEmail = (participant: Participant) => {
    setEditingEmailId(participant.id)
    setEditEmailValue(participant.email || '')
  }

  const handleSaveEmail = async (participant: Participant) => {
    setSavingEmailId(participant.id)
    const newEmail = editEmailValue.trim() || null
    const hadEmail = !!participant.email
    await updateParticipant(participant.id, { email: newEmail })

    // Send invitation if email is newly set
    if (newEmail && !hadEmail && currentTrip && user) {
      sendInvitation({
        participantId: participant.id,
        participantEmail: newEmail,
        participantName: participant.name,
        tripId: currentTrip.id,
        tripCode: currentTrip.trip_code,
        tripName: currentTrip.name,
        organiserName,
        inviterId: user.id,
      })
    }

    setSavingEmailId(null)
    setEditingEmailId(null)
    setEditEmailValue('')
  }

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <Card>
        <CardHeader>
          <CardTitle>Add Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Participant Name</Label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                required
                disabled={adding}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(optional — sends invite)</span></Label>
              <Input
                type="email"
                inputMode="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., john@example.com"
                disabled={adding}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAdult"
                checked={isAdult}
                onCheckedChange={(checked) => setIsAdult(checked as boolean)}
                disabled={adding}
              />
              <label
                htmlFor="isAdult"
                className="text-sm text-foreground cursor-pointer"
              >
                Adult (can pay for expenses)
              </label>
            </div>

            <Button
              type="submit"
              disabled={adding || !name.trim()}
              className="w-full"
            >
              <UserPlus size={16} className="mr-2" />
              {adding ? 'Adding...' : 'Add Participant'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((participant) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-accent/5 rounded-lg border border-accent/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {participant.name}
                      </span>
                      <Badge variant={participant.is_adult ? 'soft' : 'outline'}>
                        {participant.is_adult ? 'Adult' : 'Child'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        onClick={() => handleStartEditEmail(participant)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={participant.email ? `Email: ${participant.email}` : 'Add email'}
                      >
                        <Mail size={15} className={participant.email ? 'text-accent' : 'text-muted-foreground'} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(participant.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Inline email editor */}
                  {editingEmailId === participant.id && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        type="email"
                        inputMode="email"
                        value={editEmailValue}
                        onChange={(e) => setEditEmailValue(e.target.value)}
                        placeholder="Email address"
                        className="h-8 text-sm flex-1"
                        disabled={savingEmailId === participant.id}
                      />
                      <Button
                        onClick={() => handleSaveEmail(participant)}
                        size="sm"
                        className="h-8 px-3"
                        disabled={savingEmailId === participant.id}
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        onClick={() => { setEditingEmailId(null); setEditEmailValue('') }}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        disabled={savingEmailId === participant.id}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  )}

                  {/* Show email if set and not editing */}
                  {participant.email && editingEmailId !== participant.id && (
                    <button
                      onClick={() => handleStartEditEmail(participant)}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={11} />
                      {participant.email}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
