import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, CloudSun, Moon } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import type { Meal, MealType, CreateMealInput, UpdateMealInput } from '@/types/meal'
import { MEAL_TYPE_LABELS } from '@/types/meal'
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
} from "@/components/ui/select"
import { fadeInUp } from '@/lib/animations'

const mealTypeIcons = {
  breakfast: Sun,
  lunch: CloudSun,
  dinner: Moon,
}

const mealTypeColors = {
  breakfast: 'text-gold',
  lunch: 'text-primary',
  dinner: 'text-secondary',
}

interface MealFormProps {
  meal?: Meal
  initialDate?: string
  initialMealType?: MealType
  onSuccess: () => void
  onCancel: () => void
}

export function MealForm({
  meal,
  initialDate,
  initialMealType,
  onSuccess,
  onCancel,
}: MealFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { createMeal, updateMeal } = useMealContext()
  const participantContext = useParticipantContext()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    meal_date: meal?.meal_date || initialDate || '',
    meal_type: meal?.meal_type || initialMealType || 'lunch' as MealType,
    title: meal?.title || '',
    description: meal?.description || '',
    responsible_participant_id: meal?.responsible_participant_id || '',
  })

  // Defensive checks for context availability
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
      setError('Please enter a meal title')
      return
    }

    if (!formData.meal_date) {
      setError('Please select a date')
      return
    }

    setSubmitting(true)

    try {
      if (meal) {
        const updateData: UpdateMealInput = {
          meal_date: formData.meal_date,
          meal_type: formData.meal_type,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          responsible_participant_id: formData.responsible_participant_id || undefined,
        }

        const result = await updateMeal(meal.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to update meal')
        }
      } else {
        const createData: CreateMealInput = {
          trip_id: currentTrip.id,
          meal_date: formData.meal_date,
          meal_type: formData.meal_type,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          responsible_participant_id: formData.responsible_participant_id || undefined,
        }

        const result = await createMeal(createData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to create meal')
        }
      }
    } catch (error) {
      setError('An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  const MealIcon = mealTypeIcons[formData.meal_type]

  return (
    <motion.form
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
        <Label htmlFor="title">Meal Title</Label>
        <div className="relative">
          <Input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Pasta Carbonara"
            required
            disabled={submitting}
            className="pl-10"
          />
          <MealIcon
            size={18}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${mealTypeColors[formData.meal_type]}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="meal_date">Date</Label>
          <Input
            type="date"
            id="meal_date"
            value={formData.meal_date}
            onChange={(e) => setFormData({ ...formData, meal_date: e.target.value })}
            min={currentTrip.start_date}
            max={currentTrip.end_date}
            required
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meal_type">Meal Type</Label>
          <Select
            value={formData.meal_type}
            onValueChange={(value) => setFormData({ ...formData, meal_type: value as MealType })}
            disabled={submitting}
          >
            <SelectTrigger id="meal_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">
                <div className="flex items-center gap-2">
                  <Sun size={16} className="text-gold" />
                  <span>{MEAL_TYPE_LABELS.breakfast}</span>
                </div>
              </SelectItem>
              <SelectItem value="lunch">
                <div className="flex items-center gap-2">
                  <CloudSun size={16} className="text-primary" />
                  <span>{MEAL_TYPE_LABELS.lunch}</span>
                </div>
              </SelectItem>
              <SelectItem value="dinner">
                <div className="flex items-center gap-2">
                  <Moon size={16} className="text-secondary" />
                  <span>{MEAL_TYPE_LABELS.dinner}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Notes, recipe, dietary considerations..."
          rows={3}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsible">Who's Cooking? (Optional)</Label>
        <Select
          value={formData.responsible_participant_id}
          onValueChange={(value) => setFormData({ ...formData, responsible_participant_id: value })}
          disabled={submitting}
        >
          <SelectTrigger id="responsible">
            <SelectValue placeholder="-- None --" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">-- None --</SelectItem>
            {adults.map((participant) => (
              <SelectItem key={participant.id} value={participant.id}>
                {participant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          {submitting ? 'Saving...' : meal ? 'Update Meal' : 'Add Meal'}
        </Button>
      </div>
    </motion.form>
  )
}
