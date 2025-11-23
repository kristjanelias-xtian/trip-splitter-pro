import { useState } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import type { Meal, MealType, CreateMealInput, UpdateMealInput } from '@/types/meal'
import { MEAL_TYPE_LABELS } from '@/types/meal'

interface MealFormProps {
  meal?: Meal // If provided, we're editing; otherwise creating
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
  const { participants } = useParticipantContext()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    meal_date: meal?.meal_date || initialDate || '',
    meal_type: meal?.meal_type || initialMealType || 'lunch' as MealType,
    title: meal?.title || '',
    description: meal?.description || '',
    responsible_participant_id: meal?.responsible_participant_id || '',
  })

  if (!currentTrip) return null

  const adults = participants.filter((p) => p.is_adult)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('Please enter a meal title')
      return
    }

    if (!formData.meal_date) {
      alert('Please select a date')
      return
    }

    setSubmitting(true)

    try {
      if (meal) {
        // Update existing meal
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
          alert('Failed to update meal')
        }
      } else {
        // Create new meal
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
          alert('Failed to create meal')
        }
      }
    } catch (error) {
      console.error('Error submitting meal:', error)
      alert('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Meal Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Meal Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Pasta Carbonara"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
          required
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="meal_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date *
        </label>
        <input
          type="date"
          id="meal_date"
          value={formData.meal_date}
          onChange={(e) => setFormData({ ...formData, meal_date: e.target.value })}
          min={currentTrip.start_date}
          max={currentTrip.end_date}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
          required
        />
      </div>

      {/* Meal Type */}
      <div>
        <label htmlFor="meal_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Meal Type *
        </label>
        <select
          id="meal_type"
          value={formData.meal_type}
          onChange={(e) => setFormData({ ...formData, meal_type: e.target.value as MealType })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
          required
        >
          <option value="breakfast">{MEAL_TYPE_LABELS.breakfast}</option>
          <option value="lunch">{MEAL_TYPE_LABELS.lunch}</option>
          <option value="dinner">{MEAL_TYPE_LABELS.dinner}</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Notes, recipe, dietary considerations..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent resize-none"
        />
      </div>

      {/* Responsible Person */}
      <div>
        <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Who's Cooking? (Optional)
        </label>
        <select
          id="responsible"
          value={formData.responsible_participant_id}
          onChange={(e) => setFormData({ ...formData, responsible_participant_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
        >
          <option value="">-- None --</option>
          {adults.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-neutral text-white rounded-lg hover:bg-neutral-dark disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : meal ? 'Update Meal' : 'Add Meal'}
        </button>
      </div>
    </form>
  )
}
