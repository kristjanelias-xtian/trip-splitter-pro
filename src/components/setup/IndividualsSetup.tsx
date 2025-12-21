import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fadeInUp } from '@/lib/animations'

interface IndividualsSetupProps {
  onComplete?: () => void
  hasSetup?: boolean
}

export function IndividualsSetup({ onComplete: _onComplete, hasSetup: _hasSetup = false }: IndividualsSetupProps = {}) {
  const { currentTrip } = useCurrentTrip()
  const { participants, createParticipant, deleteParticipant } = useParticipantContext()

  const [name, setName] = useState('')
  const [isAdult, setIsAdult] = useState(true)
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()

    if (!currentTrip || !name.trim()) return

    setAdding(true)
    try {
      await createParticipant({
        trip_id: currentTrip.id,
        name: name.trim(),
        is_adult: isAdult,
        family_id: null,
      })
      setName('')
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
                  className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {participant.name}
                    </span>
                    <Badge variant={participant.is_adult ? 'soft' : 'outline'}>
                      {participant.is_adult ? 'Adult' : 'Child'}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => handleDelete(participant.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X size={16} />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
