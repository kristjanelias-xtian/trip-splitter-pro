import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react'
import { Plus, UserPlus, X, Users, Smartphone, ChevronRight, Check } from 'lucide-react'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useTripContacts, TripContact } from '@/hooks/useTripContacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'

interface QuickParticipantPickerProps {
  tripId: string
}

export function QuickParticipantPicker({ tripId }: QuickParticipantPickerProps) {
  const { participants, createParticipant } = useParticipantContext()
  const { contacts } = useTripContacts(tripId)

  const [addedNames, setAddedNames] = useState<string[]>([])
  const [supportsContacts, setSupportsContacts] = useState(false)
  const [recentExpanded, setRecentExpanded] = useState(false)

  // Manual add form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Autocomplete state
  const [suggestedUserId, setSuggestedUserId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  // Filtered contacts for autocomplete dropdown
  const filteredContacts = useMemo(() => {
    if (name.trim().length < 2 || contacts.length === 0) return []
    const query = name.toLowerCase()
    return contacts
      .filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.display_name?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [name, contacts])

  // Show/hide dropdown based on filtered results
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    setShowDropdown(filteredContacts.length > 0)
    setActiveIndex(-1)
  }, [filteredContacts.length])

  // Click outside to close dropdown
  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const handleSelectContact = useCallback((contact: TripContact) => {
    justSelectedRef.current = true
    setName(contact.display_name ?? contact.name)
    setEmail(contact.email || '')
    setSuggestedUserId(contact.user_id)
    setShowDropdown(false)
    setActiveIndex(-1)
    setTimeout(() => emailInputRef.current?.focus(), 0)
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    setSuggestedUserId(null)
  }, [])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredContacts.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev < filteredContacts.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredContacts.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelectContact(filteredContacts[activeIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }, [showDropdown, filteredContacts, activeIndex, handleSelectContact])

  // Check contacts API support on mount
  useEffect(() => {
    setSupportsContacts('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function')
  }, [])

  const addPerson = async (personName: string, personEmail: string | null, personUserId?: string | null, isAdult?: boolean) => {
    const emailLower = personEmail?.trim().toLowerCase() ?? null
    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) return null // silently skip duplicate
    }

    const input = {
      trip_id: tripId,
      name: personName.trim(),
      is_adult: isAdult ?? true,
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
    await addPerson(contact.display_name ?? contact.name, contact.email, contact.user_id, contact.is_adult)
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
      await addPerson(name.trim(), email.trim() || null, suggestedUserId)
      setName('')
      setEmail('')
      setSuggestedUserId(null)
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
          <button
            type="button"
            onClick={() => setRecentExpanded(prev => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full"
          >
            <Users size={14} />
            <span>Recent ({contacts.slice(0, 20).length})</span>
            <ChevronRight
              size={14}
              className={`transition-transform ${recentExpanded ? 'rotate-90' : ''}`}
            />
          </button>
          {recentExpanded && (
            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {contacts.slice(0, 20).map((contact, i) => {
                const added = isAdded(contact)
                const displayName = contact.display_name ?? contact.name
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      added ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="font-medium truncate">{displayName}</span>
                    {!contact.is_adult && (
                      <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 shrink-0">Child</span>
                    )}
                    {contact.email && (
                      <span className="text-xs text-muted-foreground truncate ml-auto mr-2">
                        {contact.email}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => !added && handleAddRecent(contact)}
                      disabled={added}
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        added
                          ? 'text-primary cursor-default'
                          : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label={added ? `${displayName} already added` : `Add ${displayName}`}
                    >
                      {added ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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
            <div className="relative flex-1">
              <Input
                ref={nameInputRef}
                placeholder="Name"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                onKeyDown={handleNameKeyDown}
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-controls="quick-contact-suggestions"
              />
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  id="quick-contact-suggestions"
                  role="listbox"
                  className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-md mt-1 max-h-[200px] overflow-y-auto"
                >
                  {filteredContacts.map((contact, i) => (
                    <button
                      key={`${contact.email ?? contact.name}-${i}`}
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        i === activeIndex ? 'bg-accent/50' : 'hover:bg-accent/30'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSelectContact(contact)
                      }}
                    >
                      <div className="font-medium text-sm">
                        {contact.display_name ?? contact.name}
                      </div>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      )}
                      {contact.user_id && (
                        <div className="text-xs text-primary">✓ Has Spl1t account</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="sm" disabled={adding || !name.trim()}>
              {adding ? '…' : 'Add'}
            </Button>
          </div>
          <div>
            <Label className="sr-only" htmlFor="picker-email">Email (optional)</Label>
            <Input
              ref={emailInputRef}
              id="picker-email"
              type="email"
              inputMode="email"
              placeholder="Email (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="section-participant email"
            />
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
