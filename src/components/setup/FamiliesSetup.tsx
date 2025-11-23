import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Users, Edit } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fadeInUp } from '@/lib/animations'
import type { Family } from '@/types/participant'

interface FamiliesSetupProps {
  onComplete: () => void
  hasSetup: boolean
}

export function FamiliesSetup({ onComplete, hasSetup }: FamiliesSetupProps) {
  const { currentTrip } = useCurrentTrip()
  const {
    families,
    createFamily,
    createParticipant,
    deleteFamily,
    deleteParticipant,
    updateFamily,
    updateParticipant,
    getParticipantsByFamily,
  } = useParticipantContext()

  const [familyName, setFamilyName] = useState('')
  const [adultNames, setAdultNames] = useState(['', ''])
  const [childrenNames, setChildrenNames] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [editFamilyName, setEditFamilyName] = useState('')
  const [editAdults, setEditAdults] = useState<Array<{ id: string; name: string }>>([])
  const [editChildren, setEditChildren] = useState<Array<{ id: string; name: string }>>([])
  const [updating, setUpdating] = useState(false)

  const handleAddFamily = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentTrip || !familyName.trim()) return

    const validAdults = adultNames.filter(n => n.trim())
    if (validAdults.length === 0) {
      setError('Please add at least one adult')
      return
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
        // Create adult participants
        for (const name of validAdults) {
          await createParticipant({
            trip_id: currentTrip.id,
            family_id: family.id,
            name: name.trim(),
            is_adult: true,
          })
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
        setAdultNames(['', ''])
        setChildrenNames([])
      }
    } catch (err) {
      setError('Failed to add family. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteFamily = async (familyId: string) => {
    if (window.confirm('Remove this family and all its members?')) {
      // Get all participants in this family
      const familyParticipants = getParticipantsByFamily(familyId)

      // Delete all participants first
      for (const participant of familyParticipants) {
        await deleteParticipant(participant.id)
      }

      // Then delete the family
      await deleteFamily(familyId)
    }
  }

  const handleStartEdit = (family: Family) => {
    const familyParticipants = getParticipantsByFamily(family.id)
    const adults = familyParticipants.filter(p => p.is_adult)
    const children = familyParticipants.filter(p => !p.is_adult)

    setEditingFamily(family)
    setEditFamilyName(family.family_name)
    setEditAdults(adults.map(a => ({ id: a.id, name: a.name })))
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
      // Validate at least one adult
      const validAdults = editAdults.filter(a => a.name.trim())
      if (validAdults.length === 0) {
        setError('Please keep at least one adult')
        setUpdating(false)
        return
      }

      // Update family name if changed
      if (editFamilyName.trim() !== editingFamily.family_name) {
        await updateFamily(editingFamily.id, {
          family_name: editFamilyName.trim(),
        })
      }

      // Update all participant names
      for (const adult of validAdults) {
        await updateParticipant(adult.id, {
          name: adult.name.trim(),
        })
      }

      const validChildren = editChildren.filter(c => c.name.trim())
      for (const child of validChildren) {
        await updateParticipant(child.id, {
          name: child.name.trim(),
        })
      }

      // Close dialog
      handleCancelEdit()
    } catch (err) {
      setError('Failed to update family. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const canComplete = families.length > 0

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
              <Label>Adults (at least 1 required)</Label>
              {adultNames.map((name, index) => (
                <Input
                  key={index}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newAdults = [...adultNames]
                    newAdults[index] = e.target.value
                    setAdultNames(newAdults)
                  }}
                  placeholder={`Adult ${index + 1} name`}
                  disabled={adding}
                />
              ))}
              <Button
                type="button"
                onClick={() => setAdultNames([...adultNames, ''])}
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
              disabled={adding || !familyName.trim() || adultNames.every(n => !n.trim())}
              className="w-full"
            >
              <Users size={16} className="mr-2" />
              {adding ? 'Adding...' : 'Add Family'}
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
                        <strong className="text-foreground">Adults:</strong> {adults.map(a => a.name).join(', ')}
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

      {canComplete && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={onComplete}
              className="w-full"
              size="lg"
            >
              {hasSetup ? 'Update & Continue' : 'Complete Setup'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!canComplete && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
              <p className="text-muted-foreground">
                Add at least one family to continue
              </p>
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
              Update family name and participant names
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
                <Input
                  key={adult.id}
                  type="text"
                  value={adult.name}
                  onChange={(e) => {
                    const newAdults = [...editAdults]
                    newAdults[index].name = e.target.value
                    setEditAdults(newAdults)
                  }}
                  placeholder={`Adult ${index + 1} name`}
                  disabled={updating}
                />
              ))}
            </div>

            {editChildren.length > 0 && (
              <div className="space-y-2">
                <Label>Children</Label>
                {editChildren.map((child, index) => (
                  <Input
                    key={child.id}
                    type="text"
                    value={child.name}
                    onChange={(e) => {
                      const newChildren = [...editChildren]
                      newChildren[index].name = e.target.value
                      setEditChildren(newChildren)
                    }}
                    placeholder={`Child ${index + 1} name`}
                    disabled={updating}
                  />
                ))}
              </div>
            )}

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
    </motion.div>
  )
}
