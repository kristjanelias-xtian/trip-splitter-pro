// SPDX-License-Identifier: Apache-2.0
import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Clock, X } from 'lucide-react'
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
import { logger } from '@/lib/logger'

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
  const { t } = useTranslation()
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
    // TIME comes back from the DB as HH:MM:SS; <input type="time"> needs HH:MM
    start_time: activity?.start_time ? activity.start_time.slice(0, 5) : '',
    description: activity?.description || '',
    location: activity?.location || '',
    link: activity?.link || '',
    responsible_participant_id: activity?.responsible_participant_id || 'none',
  })

  // Native <input type="time"> renders the current time when empty on iOS Safari,
  // which makes an unset optional time look like a real value (see #793). Only show
  // the input once a time exists or the user explicitly taps "Add time".
  const [showTimeInput, setShowTimeInput] = useState(!!formData.start_time)

  if (!currentTrip) return null

  if (!participantContext || participantContext.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">{t('planner.loadingParticipants')}</div>
      </div>
    )
  }

  const { participants } = participantContext
  const adults = participants.filter((p) => p.is_adult)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError(t('planner.pleaseEnterActivityTitle'))
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
          start_time: formData.start_time || null,
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          link: formData.link.trim() || undefined,
          responsible_participant_id: responsibleId,
        }

        const result = await updateActivity(activity.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError(t('planner.failedToUpdateActivity'))
        }
      } else {
        const createData: CreateActivityInput = {
          trip_id: currentTrip.id,
          activity_date: date,
          time_slot: timeSlot,
          start_time: formData.start_time || null,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          link: formData.link.trim() || undefined,
          responsible_participant_id: responsibleId,
        }

        const result = await createActivity(createData)
        if (result) {
          onSuccess()
        } else {
          setError(t('planner.failedToCreateActivity'))
        }
      }
    } catch (error) {
      logger.error('Error saving activity:', { error: String(error) })
      setError(t('planner.errorSavingActivity'))
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
        <Label htmlFor="activity-title">{t('planner.activityTitle')}</Label>
        <Input
          type="text"
          id="activity-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('planner.activityTitlePlaceholder')}
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-start-time">{t('planner.activityTimeOptional')}</Label>
        {showTimeInput ? (
          <div className="flex items-center gap-2">
            <Input
              type="time"
              id="activity-start-time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              disabled={submitting}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('planner.clearTime')}
              disabled={submitting}
              onClick={() => {
                setFormData({ ...formData, start_time: '' })
                setShowTimeInput(false)
              }}
            >
              <X size={16} />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => setShowTimeInput(true)}
            className="w-full justify-start text-muted-foreground font-normal"
          >
            <Clock size={16} className="mr-2" />
            {t('planner.addTime')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-description">{t('planner.activityDescriptionOptional')}</Label>
        <Textarea
          id="activity-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('planner.activityDescriptionPlaceholder')}
          rows={3}
          disabled={submitting}
          required={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-location">{t('planner.activityLocationOptional')}</Label>
        <Input
          type="text"
          id="activity-location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder={t('planner.activityLocationPlaceholder')}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-link">{t('planner.activityLinkOptional')}</Label>
        <Input
          type="url"
          id="activity-link"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://..."
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-responsible">{t('planner.responsiblePersonOptional')}</Label>
        <Select
          value={formData.responsible_participant_id}
          onValueChange={(value) => setFormData({ ...formData, responsible_participant_id: value })}
          disabled={submitting}
        >
          <SelectTrigger id="activity-responsible">
            <SelectValue placeholder={t('planner.none')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('planner.none')}</SelectItem>
            {adults.map((participant) => (
              <SelectItem key={participant.id} value={participant.id}>
                {participant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('planner.timeSlotActivity', { slot: TIME_SLOT_LABELS[timeSlot] })}
      </p>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={submitting}
          className="flex-1"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? t('common.saving') : activity ? t('planner.updateActivity') : t('planner.addActivity')}
        </Button>
      </div>
    </motion.form>
  )
}
