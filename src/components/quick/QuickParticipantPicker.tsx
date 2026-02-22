import { useState, useEffect, FormEvent } from 'react'
import { Plus, UserPlus, X, Users, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'

interface RecentPerson {
  name: string
  email: string | null
}

interface QuickParticipantPickerProps {
  tripId: string
  tripCode: string
  tripName: string
}

export function QuickParticipantPicker({ tripId, tripCode, tripName }: QuickParticipantPickerProps) {
  const { user, userProfile } = useAuth()
  const { participants, createParticipant } = useParticipantContext()

  const [recentPeople, setRecentPeople] = useState<RecentPerson[]>([])
  const [addedNames, setAddedNames] = useState<string[]>([])
  const [supportsContacts, setSupportsContacts] = useState(false)

  // Manual add form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check contacts API support on mount
  useEffect(() => {
    setSupportsContacts('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function')
  }, [])

  // Fetch recent people from past trips by this user
  useEffect(() => {
    if (!user) return

    const fetchRecent = async () => {
      try {
        // Fetch participants from trips created_by this user, excluding self
        const { data, error: fetchError } = await supabase
          .from('participants')
          .select('name, email, trips!inner(created_by)')
          .eq('trips.created_by', user.id)
          .is('user_id', null)  // exclude self (linked participants)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fetchError) {
          logger.warn('Failed to fetch recent people', { error: fetchError.message })
          return
        }

        // Deduplicate by email (preferred) or name
        const seen = new Set<string>()
        const deduped: RecentPerson[] = []
        for (const row of (data ?? []) as any[]) {
          const key = row.email?.toLowerCase() ?? row.name.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            deduped.push({ name: row.name, email: row.email ?? null })
          }
          if (deduped.length >= 20) break
        }

        setRecentPeople(deduped)
      } catch (err) {
        logger.warn('Unhandled error fetching recent people', { error: String(err) })
      }
    }

    fetchRecent()
  }, [user?.id])

  const organiserName = userProfile?.display_name || user?.email?.split('@')[0] || 'Organiser'

  const sendInvitation = async (participantId: string, participantEmail: string, participantName: string) => {
    try {
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .insert([{ trip_id: tripId, participant_id: participantId, inviter_id: user!.id }])
        .select('id, token')
        .single()

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

  const addPerson = async (personName: string, personEmail: string | null) => {
    const emailLower = personEmail?.trim().toLowerCase() ?? null
    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) return // silently skip duplicate
    }

    const newParticipant = await createParticipant({
      trip_id: tripId,
      name: personName.trim(),
      is_adult: true,
      family_id: null,
      email: emailLower || null,
    })

    if (newParticipant) {
      setAddedNames(prev => [...prev, personName.trim()])
      if (newParticipant.email && user) {
        sendInvitation(newParticipant.id, newParticipant.email, newParticipant.name)
      }
    }
  }

  const handleAddRecent = async (person: RecentPerson) => {
    await addPerson(person.name, person.email)
  }

  const handleAddFromContacts = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'email'], { multiple: true })
      for (const contact of contacts ?? []) {
        const personName = contact.name?.[0] ?? ''
        const personEmail = contact.email?.[0] ?? null
        if (personName.trim()) {
          await addPerson(personName.trim(), personEmail)
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
      await addPerson(name.trim(), email.trim() || null)
      setName('')
      setEmail('')
    } finally {
      setAdding(false)
    }
  }

  const isAdded = (person: RecentPerson) =>
    addedNames.includes(person.name) ||
    participants.some(p => p.name === person.name && (
      !person.email || p.email?.toLowerCase() === person.email?.toLowerCase()
    ))

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

      {/* Section A: Recent people */}
      {recentPeople.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users size={14} />
            Recent
          </div>
          <div className="flex flex-wrap gap-2">
            {recentPeople.map((person, i) => {
              const added = isAdded(person)
              return (
                <button
                  key={i}
                  onClick={() => !added && handleAddRecent(person)}
                  disabled={added}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    added
                      ? 'border-primary/30 bg-primary/10 text-primary cursor-default'
                      : 'border-border hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  }`}
                >
                  {added ? null : <Plus size={12} />}
                  {person.name}
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
            />
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
