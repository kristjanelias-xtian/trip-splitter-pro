import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Users, User, Edit, Mail } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fadeInUp } from '@/lib/animations'
import type { Family, Participant } from '@/types/participant'
import { logger } from '@/lib/logger'

interface FamiliesSetupProps {
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

export function FamiliesSetup({ onComplete: _onComplete, hasSetup: _hasSetup = false }: FamiliesSetupProps = {}) {
  const { currentTrip } = useCurrentTrip()
  const {
    families,
    participants,
    createFamily,
    createParticipant,
    deleteFamily,
    deleteParticipant,
    updateFamily,
    updateParticipant,
    getParticipantsByFamily,
  } = useParticipantContext()
  const { user, userProfile } = useAuth()

  const organiserName = userProfile?.display_name || user?.email?.split('@')[0] || 'Organiser'

  const [familyName, setFamilyName] = useState('')
  const [adultEntries, setAdultEntries] = useState([{ name: '', email: '' }, { name: '', email: '' }])
  const [childrenNames, setChildrenNames] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit family state
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [editFamilyName, setEditFamilyName] = useState('')
  const [editAdults, setEditAdults] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [editChildren, setEditChildren] = useState<Array<{ id: string; name: string }>>([])
  const [updating, setUpdating] = useState(false)

  // Add individual state
  const [individualName, setIndividualName] = useState('')
  const [isAdult, setIsAdult] = useState(true)
  const [addingIndividual, setAddingIndividual] = useState(false)

  // Edit individual state
  const [editingIndividual, setEditingIndividual] = useState<Participant | null>(null)
  const [editIndividualName, setEditIndividualName] = useState('')
  const [editIsAdult, setEditIsAdult] = useState(true)
  const [updatingIndividual, setUpdatingIndividual] = useState(false)

  const handleAddFamily = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentTrip || !familyName.trim()) return

    const validAdults = adultEntries.filter(a => a.name.trim())
    if (validAdults.length === 0) {
      setError('Please add at least one adult')
      return
    }

    // Duplicate-email check: only the first adult can have an email
    const firstEmail = validAdults[0]?.email?.trim().toLowerCase()
    if (firstEmail) {
      const duplicate = participants.some(p => p.email?.toLowerCase() === firstEmail)
      if (duplicate) {
        setError('This email is already used by another participant in this trip.')
        return
      }
    }

    setAdding(true)
    try {
      // Create family
      const family = await createFamily({
        trip_id: currentTrip.id,
        family_name: familyName.trim(),
        adults: validAdults.length,
        children: childrenNames.filter(n => n.trim()).length,
      })

      if (family) {
        // Create adult participants — only first adult gets an email
        for (const [adultIndex, adult] of validAdults.entries()) {
          const adultEmail = adultIndex === 0 ? (adult.email.trim() || null) : null
          const newParticipant = await createParticipant({
            trip_id: currentTrip.id,
            family_id: family.id,
            name: adult.name.trim(),
            is_adult: true,
            email: adultEmail,
          })

          // Send invitation if email provided (first adult only)
          if (newParticipant && adultEmail && user) {
            sendInvitation({
              participantId: newParticipant.id,
              participantEmail: adultEmail,
              participantName: newParticipant.name,
              tripId: currentTrip.id,
              tripCode: currentTrip.trip_code,
              tripName: currentTrip.name,
              organiserName,
              inviterId: user.id,
            })
          }
        }

        // Create child participants
        for (const name of childrenNames.filter(n => n.trim())) {
          await createParticipant({
            trip_id: currentTrip.id,
            family_id: family.id,
            name: name.trim(),
            is_adult: false,
          })
        }

        // Reset form
        setFamilyName('')
        setAdultEntries([{ name: '', email: '' }, { name: '', email: '' }])
        setChildrenNames([])
      }
    } catch {
      setError('Failed to add family. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteFamily = async (familyId: string) => {
    if (window.confirm('Remove this family and all its members?')) {
      const familyParticipants = getParticipantsByFamily(familyId)
      for (const participant of familyParticipants) {
        await deleteParticipant(participant.id)
      }
      await deleteFamily(familyId)
    }
  }

  const handleStartEdit = (family: Family) => {
    const familyParticipants = getParticipantsByFamily(family.id)
    const adults = familyParticipants.filter(p => p.is_adult)
    const children = familyParticipants.filter(p => !p.is_adult)

    setEditingFamily(family)
    setEditFamilyName(family.family_name)
    setEditAdults(adults.map(a => ({ id: a.id, name: a.name, email: a.email || '' })))
    setEditChildren(children.map(c => ({ id: c.id, name: c.name })))
  }

  const handleCancelEdit = () => {
    setEditingFamily(null)
    setEditFamilyName('')
    setEditAdults([])
    setEditChildren([])
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingFamily || !currentTrip) return

    setError(null)
    setUpdating(true)

    try {
      const validAdults = editAdults.filter(a => a.name.trim())
      if (validAdults.length === 0) {
        setError('Please keep at least one adult')
        setUpdating(false)
        return
      }

      // Duplicate-email check for the first adult's email (only they can have one)
      const firstAdultEmail = validAdults[0]?.email?.trim().toLowerCase()
      if (firstAdultEmail) {
        const familyMemberIds = getParticipantsByFamily(editingFamily.id).map(p => p.id)
        const duplicate = participants.some(
          p => !familyMemberIds.includes(p.id) && p.email?.toLowerCase() === firstAdultEmail
        )
        if (duplicate) {
          setError('This email is already used by another participant in this trip.')
          setUpdating(false)
          return
        }
      }

      // Update family name if changed
      if (editFamilyName.trim() !== editingFamily.family_name) {
        await updateFamily(editingFamily.id, { family_name: editFamilyName.trim() })
      }

      // Get original adults to detect email changes
      const originalAdults = getParticipantsByFamily(editingFamily.id).filter(p => p.is_adult)

      // Update all adult names and emails — only first adult gets an email
      for (const [adultIndex, adult] of validAdults.entries()) {
        const original = originalAdults.find(a => a.id === adult.id)
        const newEmail = adultIndex === 0 ? (adult.email.trim() || null) : null

        await updateParticipant(adult.id, {
          name: adult.name.trim(),
          email: newEmail,
        })

        // Send invitation if email is newly set (first adult only)
        if (newEmail && !original?.email && user) {
          sendInvitation({
            participantId: adult.id,
            participantEmail: newEmail,
            participantName: adult.name.trim(),
            tripId: currentTrip.id,
            tripCode: currentTrip.trip_code,
            tripName: currentTrip.name,
            organiserName,
            inviterId: user.id,
          })
        }
      }

      // Get original children to detect deletions
      const originalChildren = getParticipantsByFamily(editingFamily.id).filter(p => !p.is_adult)
      const currentChildIds = editChildren.map(c => c.id)

      for (const originalChild of originalChildren) {
        if (!currentChildIds.includes(originalChild.id)) {
          await deleteParticipant(originalChild.id)
        }
      }

      const validChildren = editChildren.filter(c => c.name.trim())
      for (const child of validChildren) {
        if (child.id.startsWith('new-')) {
          await createParticipant({
            trip_id: currentTrip.id,
            family_id: editingFamily.id,
            name: child.name.trim(),
            is_adult: false,
          })
        } else {
          await updateParticipant(child.id, { name: child.name.trim() })
        }
      }

      const childCount = validChildren.filter(c => !c.id.startsWith('new-')).length +
                        validChildren.filter(c => c.id.startsWith('new-')).length
      await updateFamily(editingFamily.id, { children: childCount })

      handleCancelEdit()
    } catch {
      setError('Failed to update family. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const getStandaloneIndividuals = () => {
    return participants.filter(p => p.family_id === null)
  }

  const handleAddIndividual = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentTrip || !individualName.trim()) return

    setAddingIndividual(true)
    try {
      await createParticipant({
        trip_id: currentTrip.id,
        family_id: null,
        name: individualName.trim(),
        is_adult: isAdult,
      })
      setIndividualName('')
      setIsAdult(true)
    } catch {
      setError('Failed to add individual. Please try again.')
    } finally {
      setAddingIndividual(false)
    }
  }

  const handleDeleteIndividual = async (participantId: string) => {
    if (window.confirm('Remove this individual?')) {
      await deleteParticipant(participantId)
    }
  }

  const handleStartEditIndividual = (participant: Participant) => {
    setEditingIndividual(participant)
    setEditIndividualName(participant.name)
    setEditIsAdult(participant.is_adult)
  }

  const handleCancelEditIndividual = () => {
    setEditingIndividual(null)
    setEditIndividualName('')
    setEditIsAdult(true)
    setError(null)
  }

  const handleSaveEditIndividual = async () => {
    if (!editingIndividual) return

    setError(null)
    setUpdatingIndividual(true)

    try {
      await updateParticipant(editingIndividual.id, {
        name: editIndividualName.trim(),
        is_adult: editIsAdult,
      })
      handleCancelEditIndividual()
    } catch {
      setError('Failed to update individual. Please try again.')
    } finally {
      setUpdatingIndividual(false)
    }
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
          <CardTitle>Add Family</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleAddFamily} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                type="text"
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g., The Smiths"
                required
                disabled={adding}
              />
            </div>

            <div className="space-y-2">
              <Label>Adults <span className="text-muted-foreground font-normal">(at least 1 required)</span></Label>
              {adultEntries.map((adult, index) => (
                <div key={index} className="space-y-1.5">
                  <Input
                    type="text"
                    value={adult.name}
                    onChange={(e) => {
                      const updated = [...adultEntries]
                      updated[index] = { ...updated[index], name: e.target.value }
                      setAdultEntries(updated)
                    }}
                    placeholder={`Adult ${index + 1} name`}
                    disabled={adding}
                  />
                  {index === 0 && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                      <Input
                        type="email"
                        inputMode="email"
                        value={adult.email}
                        onChange={(e) => {
                          const updated = [...adultEntries]
                          updated[index] = { ...updated[index], email: e.target.value }
                          setAdultEntries(updated)
                        }}
                        placeholder="Email (optional — sends invite)"
                        disabled={adding}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button
                type="button"
                onClick={() => setAdultEntries([...adultEntries, { name: '', email: '' }])}
                variant="ghost"
                size="sm"
                disabled={adding}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add another adult
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Children (optional)</Label>
              {childrenNames.map((name, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newChildren = [...childrenNames]
                      newChildren[index] = e.target.value
                      setChildrenNames(newChildren)
                    }}
                    placeholder={`Child ${index + 1} name`}
                    disabled={adding}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => setChildrenNames(childrenNames.filter((_, i) => i !== index))}
                    variant="ghost"
                    size="sm"
                    disabled={adding}
                    className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => setChildrenNames([...childrenNames, ''])}
                variant="ghost"
                size="sm"
                disabled={adding}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add child
              </Button>
            </div>

            <Button
              type="submit"
              disabled={adding || !familyName.trim() || adultEntries.every(a => !a.name.trim())}
              className="w-full"
            >
              <Users size={16} className="mr-2" />
              {adding ? 'Adding...' : 'Add Family'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Individual Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add Individual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddIndividual} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="individualName">Name</Label>
              <Input
                type="text"
                id="individualName"
                value={individualName}
                onChange={(e) => setIndividualName(e.target.value)}
                placeholder="e.g., John Doe"
                required
                disabled={addingIndividual}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAdult"
                checked={isAdult}
                onCheckedChange={(checked) => setIsAdult(checked as boolean)}
                disabled={addingIndividual}
              />
              <label
                htmlFor="isAdult"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Is Adult?
              </label>
            </div>

            <Button
              type="submit"
              disabled={addingIndividual || !individualName.trim()}
              className="w-full"
            >
              <User size={16} className="mr-2" />
              {addingIndividual ? 'Adding...' : 'Add Individual'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {families.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Families ({families.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {families.map((family) => {
                const familyParticipants = getParticipantsByFamily(family.id)
                const adults = familyParticipants.filter(p => p.is_adult)
                const children = familyParticipants.filter(p => !p.is_adult)

                return (
                  <motion.div
                    key={family.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-accent/5 rounded-lg border border-accent/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">
                        {family.family_name}
                      </h4>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleStartEdit(family)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteFamily(family.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">
                        <strong className="text-foreground">Adults:</strong>{' '}
                        {adults.map(a => (
                          <span key={a.id}>
                            {a.name}
                            {a.email && (
                              <span className="text-xs ml-1 opacity-60" title={a.email}>
                                <Mail size={10} className="inline" />
                              </span>
                            )}
                          </span>
                        )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
                      </div>
                      {children.length > 0 && (
                        <div className="text-muted-foreground">
                          <strong className="text-foreground">Children:</strong> {children.map(c => c.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standalone Individuals List */}
      {getStandaloneIndividuals().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Standalone Individuals ({getStandaloneIndividuals().length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getStandaloneIndividuals().map((individual) => (
                <motion.div
                  key={individual.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-accent/5 rounded-lg border border-accent/10"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {individual.name}
                        {!individual.is_adult && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (child)
                          </span>
                        )}
                      </h4>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleStartEditIndividual(individual)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteIndividual(individual.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Family Dialog */}
      <Dialog open={!!editingFamily} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Family</DialogTitle>
            <DialogDescription>
              Update family name and participant details
            </DialogDescription>
          </DialogHeader>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFamilyName">Family Name</Label>
              <Input
                type="text"
                id="editFamilyName"
                value={editFamilyName}
                onChange={(e) => setEditFamilyName(e.target.value)}
                placeholder="e.g., The Smiths"
                disabled={updating}
              />
            </div>

            <div className="space-y-2">
              <Label>Adults</Label>
              {editAdults.map((adult, index) => (
                <div key={adult.id} className="space-y-1.5">
                  <Input
                    type="text"
                    value={adult.name}
                    onChange={(e) => {
                      const newAdults = [...editAdults]
                      newAdults[index] = { ...newAdults[index], name: e.target.value }
                      setEditAdults(newAdults)
                    }}
                    placeholder={`Adult ${index + 1} name`}
                    disabled={updating}
                  />
                  {index === 0 && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                      <Input
                        type="email"
                        inputMode="email"
                        value={adult.email}
                        onChange={(e) => {
                          const newAdults = [...editAdults]
                          newAdults[index] = { ...newAdults[index], email: e.target.value }
                          setEditAdults(newAdults)
                        }}
                        placeholder="Email (optional)"
                        disabled={updating}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Children</Label>
              {editChildren.map((child, index) => (
                <div key={child.id} className="flex gap-2">
                  <Input
                    type="text"
                    value={child.name}
                    onChange={(e) => {
                      const newChildren = [...editChildren]
                      newChildren[index] = { ...newChildren[index], name: e.target.value }
                      setEditChildren(newChildren)
                    }}
                    placeholder={`Child ${index + 1} name`}
                    disabled={updating}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => setEditChildren(editChildren.filter((_, i) => i !== index))}
                    variant="ghost"
                    size="sm"
                    disabled={updating}
                    className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => setEditChildren([...editChildren, { id: `new-${Date.now()}`, name: '' }])}
                variant="ghost"
                size="sm"
                disabled={updating}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add child
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                disabled={updating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updating || !editFamilyName.trim()}
                className="flex-1"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Individual Dialog */}
      <Dialog open={!!editingIndividual} onOpenChange={(open) => !open && handleCancelEditIndividual()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Individual</DialogTitle>
            <DialogDescription>
              Update individual name and adult status
            </DialogDescription>
          </DialogHeader>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editIndividualName">Name</Label>
              <Input
                type="text"
                id="editIndividualName"
                value={editIndividualName}
                onChange={(e) => setEditIndividualName(e.target.value)}
                placeholder="e.g., John Doe"
                disabled={updatingIndividual}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editIsAdult"
                checked={editIsAdult}
                onCheckedChange={(checked) => setEditIsAdult(checked as boolean)}
                disabled={updatingIndividual}
              />
              <label
                htmlFor="editIsAdult"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Is Adult?
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCancelEditIndividual}
                variant="outline"
                disabled={updatingIndividual}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditIndividual}
                disabled={updatingIndividual || !editIndividualName.trim()}
                className="flex-1"
              >
                {updatingIndividual ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
