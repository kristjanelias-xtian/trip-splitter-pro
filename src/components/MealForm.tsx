import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, CloudSun, Moon, Plus, X } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { Meal, MealType, CreateMealInput, UpdateMealInput } from '@/types/meal'
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
  const { createShoppingItem, linkShoppingItemToMeal } = useShoppingContext()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: meal?.title || '',
    description: meal?.description || '',
    responsible_participant_id: meal?.responsible_participant_id || 'none',
    ingredients: [''] as string[],
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

  // Date and meal type are fixed (passed as props)
  const mealDate = meal?.meal_date || initialDate || ''
  const mealType = meal?.meal_type || initialMealType || 'lunch'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Please enter a meal title')
      return
    }

    if (!mealDate) {
      setError('Date is required')
      return
    }

    setSubmitting(true)

    try {
      const responsibleId = formData.responsible_participant_id === 'none'
        ? undefined
        : formData.responsible_participant_id || undefined

      if (meal) {
        // Update mode
        const updateData: UpdateMealInput = {
          meal_date: mealDate,
          meal_type: mealType,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          responsible_participant_id: responsibleId,
          is_restaurant: meal.is_restaurant, // Preserve existing flags
          everyone_at_home: meal.everyone_at_home,
        }

        const result = await updateMeal(meal.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to update meal')
        }
      } else {
        // Create mode
        const createData: CreateMealInput = {
          trip_id: currentTrip.id,
          meal_date: mealDate,
          meal_type: mealType,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          responsible_participant_id: responsibleId,
          is_restaurant: false,
          everyone_at_home: false,
        }

        const result = await createMeal(createData)
        if (result) {
          // Create shopping items for each ingredient
          const nonEmptyIngredients = formData.ingredients.filter(ing => ing.trim())
          for (const ingredientName of nonEmptyIngredients) {
            const shoppingItem = await createShoppingItem({
              name: ingredientName.trim(),
              trip_id: currentTrip.id,
            })

            if (shoppingItem) {
              await linkShoppingItemToMeal(shoppingItem.id, result.id)
            }
          }

          onSuccess()
        } else {
          setError('Failed to create meal')
        }
      }
    } catch (error) {
      console.error('Error saving meal:', error)
      setError('An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  const MealIcon = mealTypeIcons[mealType]

  // Ingredient management
  const addIngredient = () => {
    setFormData({ ...formData, ingredients: [...formData.ingredients, ''] })
  }

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    })
  }

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[index] = value
    setFormData({ ...formData, ingredients: newIngredients })
  }

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
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${mealTypeColors[mealType]}`}
          />
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
            <SelectItem value="none">-- None --</SelectItem>
            {adults.map((participant) => (
              <SelectItem key={participant.id} value={participant.id}>
                {participant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredients Section - Only show in create mode */}
      {!meal && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <Label>Ingredients (Optional)</Label>
            <Button
              type="button"
              onClick={addIngredient}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={submitting}
            >
              <Plus size={14} />
              Add Ingredient
            </Button>
          </div>

          {formData.ingredients.length > 0 && (
            <div className="space-y-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    placeholder="e.g., Pasta, Bacon, Eggs"
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    variant="outline"
                    size="icon"
                    disabled={submitting}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {formData.ingredients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No ingredients added yet. Click "Add Ingredient" to add items to your shopping list.
            </p>
          )}
        </div>
      )}

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
