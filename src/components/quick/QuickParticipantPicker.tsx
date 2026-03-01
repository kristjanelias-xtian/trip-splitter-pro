import { useState, useEffect, FormEvent } from 'react'
import { Plus, UserPlus, X, Users, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useTripContacts, TripContact } from '@/hooks/useTripContacts'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'

interface QuickParticipantPickerProps {
  tripId: string
  tripCode: string
  tripName: string
}

export function QuickParticipantPicker({ tripId, tripCode, tripName }: QuickParticipantPickerProps) {
  const { user, userProfile } = useAuth()
  const { participants, createParticipant } = useParticipantContext()
  const { contacts } = useTripContacts(tripId)
  const { toast } = useToast()

  const [addedNames, setAddedNames] = useState<string[]>([])
  const [supportsContacts, setSupportsContacts] = useState(false)

  // Manual add form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendInvite, setSendInvite] = useState(true)

  // Check contacts API support on mount
  useEffect(() => {
    setSupportsContacts('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function')
  }, [])

  const organiserName = userProfile?.display_name || user?.email?.split('@')[0] || 'Organiser'

  const sendInvitation = async (participantId: string, participantEmail: string, participantName: string) => {
    try {
      const { data: inv, error: invError } = await withTimeout<any>(
        (supabase as any)
          .from('invitations')
          .insert([{ trip_id: tripId, participant_id: participantId, inviter_id: user!.id }])
          .select('id, token')
          .single(),
        15000,
        'Creating invitation timed out.'
      )

      if (invError || !inv) {
        logger.warn('Failed to create invitation row', { error: String(invError) })
        return
      }

      supabase.functions.invoke('send-email', {
        body: {
          type: 'invitation',
          invitation_id: inv.id,
          trip_name: tripName,
          trip_code: tripCode,
          participant_name: participantName,
          participant_email: participantEmail,
          organiser_name: organiserName,
          token: (inv as any).token,
        },
      }).then(({ error }) => {
        if (error) logger.warn('send-email returned error', { error: String(error) })
      })
    } catch (err) {
      logger.warn('sendInvitation: unhandled error', { error: String(err) })
    }
  }

  const addPerson = async (personName: string, personEmail: string | null, personUserId?: string | null) => {
    const emailLower = personEmail?.trim().toLowerCase() ?? null
    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) return null // silently skip duplicate
    }

    const input = {
      trip_id: tripId,
      name: personName.trim(),
      is_adult: true,
      email: emailLower || null,
      ...(personUserId ? { user_id: personUserId } : {}),
    }

    let newParticipant = await createParticipant(input)

    // If insert failed and we had a user_id, retry without it (unique constraint conflict)
    if (!newParticipant && personUserId) {
      const { user_id: _, ...inputWithoutUserId } = input
      newParticipant = await createParticipant(inputWithoutUserId)
    }

    if (newParticipant) {
      setAddedNames(prev => [...prev, personName.trim()])
    }

    return newParticipant
  }

  const handleAddRecent = async (contact: TripContact) => {
    const newParticipant = await addPerson(contact.display_name ?? contact.name, contact.email, contact.user_id)
    if (newParticipant?.email && user) {
      toast({
        title: `${newParticipant.name} added`,
        description: 'Send invite email?',
        action: (
          <ToastAction altText="Send invite" onClick={() => sendInvitation(newParticipant.id, newParticipant.email!, newParticipant.name)}>
            Send
          </ToastAction>
        ),
      })
    }
  }

  const handleAddFromContacts = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'email'], { multiple: true })
      for (const contact of contacts ?? []) {
        const personName = contact.name?.[0] ?? ''
        const personEmail = contact.email?.[0] ?? null
        if (personName.trim()) {
          const newParticipant = await addPerson(personName.trim(), personEmail)
          if (newParticipant?.email && user) {
            toast({
              title: `${newParticipant.name} added`,
              description: 'Send invite email?',
              action: (
                <ToastAction altText="Send invite" onClick={() => sendInvitation(newParticipant.id, newParticipant.email!, newParticipant.name)}>
                  Send
                </ToastAction>
              ),
            })
          }
        }
      }
    } catch (err) {
      // User dismissed picker or API error — ignore
      logger.info('Contacts picker dismissed or errored', { error: String(err) })
    }
  }

  const handleManualAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setError(null)
    const emailLower = email.trim().toLowerCase()
    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) {
        setError('This email is already in the group.')
        return
      }
    }

    setAdding(true)
    try {
      const newParticipant = await addPerson(name.trim(), email.trim() || null)
      if (newParticipant?.email && user && sendInvite) {
        sendInvitation(newParticipant.id, newParticipant.email, newParticipant.name)
      }
      setName('')
      setEmail('')
      setSendInvite(true)
    } finally {
      setAdding(false)
    }
  }

  const isAdded = (contact: TripContact) => {
    const contactDisplayName = contact.display_name ?? contact.name
    return addedNames.includes(contactDisplayName) ||
      participants.some(p => (p.name === contact.name || p.name === contactDisplayName) && (
        !contact.email || p.email?.toLowerCase() === contact.email?.toLowerCase()
      ))
  }

  const currentParticipants = participants.filter(p => p.trip_id === tripId)

  return (
    <div className="space-y-5">
      {/* Already added chips */}
      {currentParticipants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentParticipants.map(p => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Section A: People you've tripped with */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users size={14} />
            Recent
          </div>
          <div className="flex flex-wrap gap-2">
            {contacts.slice(0, 20).map((contact, i) => {
              const added = isAdded(contact)
              return (
                <button
                  key={i}
                  onClick={() => !added && handleAddRecent(contact)}
                  disabled={added}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    added
                      ? 'border-primary/30 bg-primary/10 text-primary cursor-default'
                      : 'border-border hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  }`}
                >
                  {added ? null : <Plus size={12} />}
                  {contact.display_name ?? contact.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Section B: Device contacts */}
      {supportsContacts && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Smartphone size={14} />
            Contacts
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddFromContacts}
          >
            <Smartphone size={14} />
            Add from Contacts
          </Button>
        </div>
      )}

      {/* Section C: Add manually */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <UserPlus size={14} />
          Add manually
        </div>
        <form onSubmit={handleManualAdd} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1"
              autoComplete="section-participant name"
            />
            <Button type="submit" size="sm" disabled={adding || !name.trim()}>
              {adding ? '…' : 'Add'}
            </Button>
          </div>
          <div>
            <Label className="sr-only" htmlFor="picker-email">Email (optional)</Label>
            <Input
              id="picker-email"
              type="email"
              inputMode="email"
              placeholder="Email (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="section-participant email"
            />
            {email.trim() && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="rounded border-border"
                />
                Send invite email
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Add now or let them link themselves via the trip link
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </form>
      </div>

      {/* Dismiss error */}
      {error && (
        <button
          onClick={() => setError(null)}
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          <X size={10} />
          Dismiss
        </button>
      )}
    </div>
  )
}
