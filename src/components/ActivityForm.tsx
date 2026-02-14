import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useActivityContext } from '@/contexts/ActivityContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useScrollIntoView } from '@/hooks/useScrollIntoView'
import type { Activity, ActivityTimeSlot, CreateActivityInput, UpdateActivityInput } from '@/types/activity'
import { TIME_SLOT_LABELS } from '@/types/activity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'

interface ActivityFormProps {
  activity?: Activity
  date: string
  timeSlot: ActivityTimeSlot
  onSuccess: () => void
  onCancel: () => void
}

export function ActivityForm({
  activity,
  date,
  timeSlot,
  onSuccess,
  onCancel,
}: ActivityFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { createActivity, updateActivity } = useActivityContext()
  const participantContext = useParticipantContext()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const keyboard = useKeyboardHeight()

  useScrollIntoView(formRef, {
    enabled: keyboard.isVisible,
    offset: 20,
  })

  const [formData, setFormData] = useState({
    title: activity?.title || '',
    description: activity?.description || '',
    location: activity?.location || '',
    responsible_participant_id: activity?.responsible_participant_id || 'none',
  })

  if (!currentTrip) return null

  if (!participantContext || participantContext.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading participants...</div>
      </div>
    )
  }

  const { participants } = participantContext
  const adults = participants.filter((p) => p.is_adult)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Please enter an activity title')
      return
    }

    setSubmitting(true)

    try {
      const responsibleId = formData.responsible_participant_id === 'none'
        ? undefined
        : formData.responsible_participant_id || undefined

      if (activity) {
        const updateData: UpdateActivityInput = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          responsible_participant_id: responsibleId,
        }

        const result = await updateActivity(activity.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to update activity')
        }
      } else {
        const createData: CreateActivityInput = {
          trip_id: currentTrip.id,
          activity_date: date,
          time_slot: timeSlot,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          responsible_participant_id: responsibleId,
        }

        const result = await createActivity(createData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to create activity')
        }
      }
    } catch (error) {
      console.error('Error saving activity:', error)
      setError('An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="activity-title">Activity Title</Label>
        <Input
          type="text"
          id="activity-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Temple visit, Island hopping"
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-description">Description (Optional)</Label>
        <Textarea
          id="activity-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Notes, details, booking info..."
          rows={3}
          disabled={submitting}
          required={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-location">Location (Optional)</Label>
        <Input
          type="text"
          id="activity-location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Wat Pho, Phi Phi Island"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-responsible">Responsible Person (Optional)</Label>
        <Select
          value={formData.responsible_participant_id}
          onValueChange={(value) => setFormData({ ...formData, responsible_participant_id: value })}
          disabled={submitting}
        >
          <SelectTrigger id="activity-responsible">
            <SelectValue placeholder="-- None --" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- None --</SelectItem>
            {adults.map((participant) => (
              <SelectItem key={participant.id} value={participant.id}>
                {participant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {TIME_SLOT_LABELS[timeSlot]} activity
      </p>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={submitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? 'Saving...' : activity ? 'Update Activity' : 'Add Activity'}
        </Button>
      </div>
    </motion.form>
  )
}
