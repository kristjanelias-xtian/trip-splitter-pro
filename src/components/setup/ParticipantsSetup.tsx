import { useState, useMemo, useRef, useEffect, useCallback, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Mail, Pencil, Check, UserCheck, Users, ChevronRight, Plus, Send, Baby } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContacts, TripContact } from '@/hooks/useTripContacts'
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
import { getGroupBorderColor } from '@/lib/groupColors'

interface ParticipantsSetupProps {
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

export function ParticipantsSetup({ onComplete: _onComplete, hasSetup: _hasSetup = false }: ParticipantsSetupProps = {}) {
  const { currentTrip } = useCurrentTrip()
  const { participants, createParticipant, updateParticipant, deleteParticipant } = useParticipantContext()
  const { user, userProfile } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [walletGroup, setWalletGroup] = useState('')
  const [isAdult, setIsAdult] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-participant inline email editing
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null)

  // Per-participant inline nickname editing
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null)
  const [editNicknameValue, setEditNicknameValue] = useState('')
  const [savingNicknameId, setSavingNicknameId] = useState<string | null>(null)

  // Per-participant inline wallet_group editing
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupValue, setEditGroupValue] = useState('')
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null)

  // Autocomplete: contacts from past trips
  const { contacts } = useTripContacts(currentTrip?.id)
  const [suggestedUserId, setSuggestedUserId] = useState<string | null>(null)
  const [suggestedNickname, setSuggestedNickname] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const justSelectedRef = useRef(false)

  // Recent contacts list
  const [recentExpanded, setRecentExpanded] = useState(false)
  const [recentLimit, setRecentLimit] = useState(20)
  const [addedNames, setAddedNames] = useState<string[]>([])

  // Per-participant invite tracking
  const [sentInviteIds, setSentInviteIds] = useState<Set<string>>(new Set())
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null)

  // Filtered contacts based on current name input
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
    setSuggestedNickname(contact.nickname)
    setShowDropdown(false)
    setActiveIndex(-1)
    // Focus email field so user can review/edit
    setTimeout(() => emailInputRef.current?.focus(), 0)
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    // Clear suggested values when user edits the name manually
    setSuggestedUserId(null)
    setSuggestedNickname(null)
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

  const organiserName = userProfile?.display_name || user?.email?.split('@')[0] || 'Organiser'

  // Existing wallet_group names for autocomplete suggestions
  const existingGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const p of participants) {
      if (p.wallet_group) groups.add(p.wallet_group)
    }
    return Array.from(groups).sort()
  }, [participants])

  // Group participants by wallet_group for display
  const participantGroups = useMemo(() => {
    const groups: { label: string | null; participants: Participant[] }[] = []
    const grouped = new Map<string, Participant[]>()
    const ungrouped: Participant[] = []

    for (const p of participants) {
      if (p.wallet_group) {
        const existing = grouped.get(p.wallet_group)
        if (existing) {
          existing.push(p)
        } else {
          grouped.set(p.wallet_group, [p])
        }
      } else {
        ungrouped.push(p)
      }
    }

    // Wallet groups first
    for (const [label, members] of grouped) {
      groups.push({ label, participants: members })
    }
    // Ungrouped participants
    if (ungrouped.length > 0) {
      groups.push({ label: null, participants: ungrouped })
    }

    return groups
  }, [participants])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()

    if (!currentTrip || !name.trim()) return

    setError(null)

    const emailLower = email.trim().toLowerCase()
    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) {
        setError('This email is already used by another participant in this trip.')
        return
      }
    }

    setAdding(true)
    try {
      const input = {
        trip_id: currentTrip.id,
        name: name.trim(),
        is_adult: isAdult,
        wallet_group: walletGroup.trim() || null,
        email: email.trim() || null,
        nickname: suggestedNickname || null,
        ...(suggestedUserId ? { user_id: suggestedUserId } : {}),
      }

      let newParticipant = await createParticipant(input)

      // If insert failed and we had a user_id, retry without it (unique constraint conflict)
      if (!newParticipant && suggestedUserId) {
        const { user_id: _, ...inputWithoutUserId } = input
        newParticipant = await createParticipant(inputWithoutUserId)
      }

      setName('')
      setEmail('')
      setSuggestedUserId(null)
      setSuggestedNickname(null)
      // Keep walletGroup — likely adding more people to the same group
      setIsAdult(true)
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
    const newEmail = editEmailValue.trim() || null
    if (newEmail) {
      const duplicate = participants.some(
        p => p.id !== participant.id && p.email?.toLowerCase() === newEmail.toLowerCase()
      )
      if (duplicate) {
        setError('This email is already used by another participant in this trip.')
        return
      }
    }
    setError(null)
    setSavingEmailId(participant.id)
    await updateParticipant(participant.id, { email: newEmail })
    setSavingEmailId(null)
    setEditingEmailId(null)
    setEditEmailValue('')
  }

  const handleStartEditNickname = (participant: Participant) => {
    setEditingNicknameId(participant.id)
    setEditNicknameValue(participant.nickname || '')
  }

  const handleSaveNickname = async (participant: Participant) => {
    setSavingNicknameId(participant.id)
    await updateParticipant(participant.id, {
      nickname: editNicknameValue.trim() || null,
    })
    setSavingNicknameId(null)
    setEditingNicknameId(null)
    setEditNicknameValue('')
  }

  const handleStartEditGroup = (participant: Participant) => {
    setEditingGroupId(participant.id)
    setEditGroupValue(participant.wallet_group || '')
  }

  const handleSaveGroup = async (participant: Participant) => {
    setSavingGroupId(participant.id)
    await updateParticipant(participant.id, {
      wallet_group: editGroupValue.trim() || null,
    })
    setSavingGroupId(null)
    setEditingGroupId(null)
    setEditGroupValue('')
  }

  const handleAddRecent = async (contact: TripContact) => {
    if (!currentTrip) return
    const personName = contact.display_name ?? contact.name
    const emailLower = contact.email?.trim().toLowerCase() ?? null

    if (emailLower) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === emailLower)
      if (duplicate) return
    }

    const input = {
      trip_id: currentTrip.id,
      name: personName,
      is_adult: contact.is_adult ?? true,
      email: emailLower || null,
      nickname: contact.nickname || null,
      ...(contact.user_id ? { user_id: contact.user_id } : {}),
    }

    let newParticipant = await createParticipant(input)

    if (!newParticipant && contact.user_id) {
      const { user_id: _, ...inputWithoutUserId } = input
      newParticipant = await createParticipant(inputWithoutUserId)
    }

    if (newParticipant) {
      setAddedNames(prev => [...prev, personName])
    }
  }

  const isRecentAdded = (contact: TripContact) => {
    const contactDisplayName = contact.display_name ?? contact.name
    return addedNames.includes(contactDisplayName) ||
      participants.some(p => (p.name === contact.name || p.name === contactDisplayName) && (
        !contact.email || p.email?.toLowerCase() === contact.email?.toLowerCase()
      ))
  }

  const handleSendInvite = async (participant: Participant) => {
    if (!participant.email || !currentTrip || !user) return
    setSendingInviteId(participant.id)
    await sendInvitation({
      participantId: participant.id,
      participantEmail: participant.email,
      participantName: participant.name,
      tripId: currentTrip.id,
      tripCode: currentTrip.trip_code,
      tripName: currentTrip.name,
      organiserName,
      inviterId: user.id,
    })
    setSendingInviteId(null)
    setSentInviteIds(prev => new Set(prev).add(participant.id))
    setTimeout(() => {
      setSentInviteIds(prev => {
        const next = new Set(prev)
        next.delete(participant.id)
        return next
      })
    }, 2000)
  }

  const renderParticipantRow = (participant: Participant) => (
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
          <button
            type="button"
            onClick={() => updateParticipant(participant.id, { is_adult: !participant.is_adult })}
            title={`Click to change to ${participant.is_adult ? 'Child' : 'Adult'}`}
          >
            <Badge variant={participant.is_adult ? 'soft' : 'outline'} className="cursor-pointer hover:opacity-80 transition-opacity">
              {participant.is_adult ? 'Adult' : 'Child'}
            </Badge>
          </button>
          {participant.user_id && (
            <span title="Account linked" className="shrink-0">
              <UserCheck size={12} className="text-positive" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            onClick={() => handleStartEditNickname(participant)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={participant.nickname ? `Nickname: ${participant.nickname}` : 'Set nickname'}
          >
            <Pencil size={15} className={participant.nickname ? 'text-accent' : 'text-muted-foreground'} />
          </Button>
          <Button
            onClick={() => handleStartEditGroup(participant)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={participant.wallet_group ? `Group: ${participant.wallet_group}` : 'Set shared wallet group'}
          >
            <Users size={15} className={participant.wallet_group ? 'text-accent' : 'text-muted-foreground'} />
          </Button>
          {!participant.user_id && (
            <Button
              onClick={() => handleStartEditEmail(participant)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title={participant.email ? `Email: ${participant.email}` : 'Add email'}
            >
              <Mail size={15} className={participant.email ? 'text-accent' : 'text-muted-foreground'} />
            </Button>
          )}
          {participant.email && user && (
            <Button
              onClick={() => handleSendInvite(participant)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Send invite email"
              disabled={sendingInviteId === participant.id || sentInviteIds.has(participant.id)}
            >
              {sentInviteIds.has(participant.id) ? (
                <Check size={15} className="text-positive" />
              ) : (
                <Send size={15} className="text-muted-foreground" />
              )}
            </Button>
          )}
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

      {/* Inline nickname editor */}
      {editingNicknameId === participant.id && (
        <div className="mt-2 flex gap-2">
          <Input
            type="text"
            value={editNicknameValue}
            onChange={(e) => setEditNicknameValue(e.target.value)}
            placeholder="Short name / nickname"
            className="h-8 text-sm flex-1"
            disabled={savingNicknameId === participant.id}
          />
          <Button
            onClick={() => handleSaveNickname(participant)}
            size="sm"
            className="h-8 px-3"
            disabled={savingNicknameId === participant.id}
          >
            <Check size={14} />
          </Button>
          <Button
            onClick={() => { setEditingNicknameId(null); setEditNicknameValue('') }}
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={savingNicknameId === participant.id}
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Inline wallet_group editor */}
      {editingGroupId === participant.id && (
        <div className="mt-2 flex gap-2">
          <Input
            type="text"
            value={editGroupValue}
            onChange={(e) => setEditGroupValue(e.target.value)}
            placeholder="Shared wallet group (e.g., The Smiths)"
            className="h-8 text-sm flex-1"
            list="wallet-groups"
            disabled={savingGroupId === participant.id}
          />
          <Button
            onClick={() => handleSaveGroup(participant)}
            size="sm"
            className="h-8 px-3"
            disabled={savingGroupId === participant.id}
          >
            <Check size={14} />
          </Button>
          <Button
            onClick={() => { setEditingGroupId(null); setEditGroupValue('') }}
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={savingGroupId === participant.id}
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Inline email editor */}
      {editingEmailId === participant.id && !participant.user_id && (
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

      {/* Show nickname if set and not editing */}
      {participant.nickname && editingNicknameId !== participant.id && (
        <button
          onClick={() => handleStartEditNickname(participant)}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          aka {participant.nickname}
        </button>
      )}

      {/* Show wallet_group if set and not editing */}
      {participant.wallet_group && editingGroupId !== participant.id && (
        <button
          onClick={() => handleStartEditGroup(participant)}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users size={11} />
          {participant.wallet_group}
        </button>
      )}

      {/* Show email if set and not editing */}
      {participant.email && editingEmailId !== participant.id && (
        participant.user_id ? (
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Mail size={11} />
            {participant.email}
          </span>
        ) : (
          <button
            onClick={() => handleStartEditEmail(participant)}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil size={11} />
            {participant.email}
          </button>
        )
      )}
    </motion.div>
  )

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Datalist for wallet_group autocomplete */}
      {existingGroups.length > 0 && (
        <datalist id="wallet-groups">
          {existingGroups.map(g => <option key={g} value={g} />)}
        </datalist>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Participants</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Recent contacts from past trips */}
          {contacts.length > 0 && (
            <div className="mb-4 space-y-2">
              <button
                type="button"
                onClick={() => setRecentExpanded(prev => !prev)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full"
              >
                <Users size={14} />
                <span>Recent companions</span>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${recentExpanded ? 'rotate-90' : ''}`}
                />
              </button>
              {recentExpanded && (() => {
                const sortedContacts = [...contacts].sort((a, b) => {
                  const aChild = a.is_adult === false ? 1 : 0
                  const bChild = b.is_adult === false ? 1 : 0
                  return aChild - bChild
                })
                const totalCount = sortedContacts.length
                const visibleContacts = sortedContacts.slice(0, recentLimit)
                const hasMore = totalCount > recentLimit
                const handleShowMore = () => {
                  if (recentLimit < 40) setRecentLimit(40)
                  else if (recentLimit < 60) setRecentLimit(60)
                  else setRecentLimit(totalCount)
                }
                return (
                  <>
                <div className="flex flex-wrap gap-2">
                  {visibleContacts.map((contact, i) => {
                    const added = isRecentAdded(contact)
                    const displayName = contact.display_name ?? contact.name
                    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    const isChild = contact.is_adult === false
                    const tooltip = displayName + (contact.email ? ` (${contact.email})` : '')
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => !added && handleAddRecent(contact)}
                        disabled={added}
                        title={tooltip}
                        aria-label={added ? `${displayName} already added` : `Add ${displayName}`}
                        className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-1.5 rounded-full border text-sm transition-colors ${
                          added
                            ? 'bg-primary/10 border-primary/20 text-primary/60 cursor-default'
                            : isChild
                              ? 'border-dashed border-amber-300 hover:bg-amber-50 text-foreground'
                              : 'border-border hover:bg-accent/50 text-foreground'
                        }`}
                      >
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : isChild ? (
                          <span className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0">
                            <Baby size={14} />
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 bg-primary/10 text-primary">
                            {initials}
                          </span>
                        )}
                        <span className="flex flex-col items-start min-w-0">
                          <span className="truncate max-w-[140px] leading-tight">
                            {displayName}
                          </span>
                          {contact.email && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px] leading-tight">
                              {contact.email}
                            </span>
                          )}
                        </span>
                        {added ? <Check size={12} className="shrink-0" /> : <Plus size={12} className="shrink-0 text-muted-foreground" />}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasMore ? (
                    <>Showing {visibleContacts.length} of {totalCount} · <button type="button" onClick={handleShowMore} className="underline hover:text-foreground transition-colors">Show more</button></>
                  ) : (
                    <>{totalCount} companions</>
                  )}
                </p>
                  </>
                )
              })()}
            </div>
          )}

          {!recentExpanded && (
            <>
              {error && (
                <p className="mb-3 text-sm text-destructive">{error}</p>
              )}
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="name">Participant Name</Label>
                  <Input
                    ref={nameInputRef}
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    placeholder="e.g., John Doe"
                    required
                    disabled={adding}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    aria-controls="contact-suggestions"
                  />
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      id="contact-suggestions"
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
                            e.preventDefault() // Prevent input blur
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

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    ref={emailInputRef}
                    type="email"
                    inputMode="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., john@example.com"
                    disabled={adding}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add now or let them link themselves via the trip link
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletGroup">Shared Wallet <span className="text-muted-foreground font-normal">(optional — group people who share costs)</span></Label>
                  <Input
                    type="text"
                    id="walletGroup"
                    value={walletGroup}
                    onChange={(e) => setWalletGroup(e.target.value)}
                    placeholder="e.g., The Smiths"
                    disabled={adding}
                    list="wallet-groups"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    People in the same group settle as a unit — e.g. a couple or parents with kids.
                  </p>
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
            </>
          )}
        </CardContent>
      </Card>

      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {participantGroups.map((group, groupIndex) => (
                <div key={group.label ?? '__ungrouped'}>
                  {group.label ? (
                    <div className={`rounded-lg border-l-4 ${getGroupBorderColor(groupIndex)} bg-muted/30 p-3`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-foreground" />
                        <span className="text-sm font-semibold text-foreground">{group.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.participants.length} {group.participants.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.participants.map(renderParticipantRow)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.participants.map(renderParticipantRow)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
