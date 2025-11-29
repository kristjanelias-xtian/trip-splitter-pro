import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sun, CloudSun, Moon, Plus, X } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import { supabase } from '@/lib/supabase'
import type { Meal, MealType, CreateMealInput, UpdateMealInput } from '@/types/meal'
import type { ShoppingItem, ShoppingCategory } from '@/types/shopping'
import { CATEGORY_LABELS } from '@/types/shopping'
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

interface IngredientInput {
  name: string
  quantity?: string
  category?: ShoppingCategory
}

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
  const { createMeal, updateMeal, refreshMeals } = useMealContext()
  const participantContext = useParticipantContext()
  const { createShoppingItem, linkShoppingItemToMeal, unlinkShoppingItemFromMeal } = useShoppingContext()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const [existingIngredients, setExistingIngredients] = useState<ShoppingItem[]>([])

  const [formData, setFormData] = useState({
    title: meal?.title || '',
    description: meal?.description || '',
    responsible_participant_id: meal?.responsible_participant_id || 'none',
    ingredients: [{ name: '', quantity: '', category: undefined }] as IngredientInput[],
  })

  // Load existing ingredients when editing a meal
  useEffect(() => {
    const loadIngredients = async () => {
      if (!meal) return

      setLoadingIngredients(true)
      try {
        // Fetch shopping items linked to this meal
        const { data: links, error: linksError } = await supabase
          .from('meal_shopping_items')
          .select('shopping_item_id')
          .eq('meal_id', meal.id)

        if (linksError) throw linksError

        if (links && links.length > 0) {
          const itemIds = links.map(link => link.shopping_item_id)

          const { data: items, error: itemsError } = await supabase
            .from('shopping_items')
            .select('*')
            .in('id', itemIds)

          if (itemsError) throw itemsError

          if (items) {
            setExistingIngredients(items as ShoppingItem[])
            setFormData(prev => ({
              ...prev,
              ingredients: items.map(item => ({
                name: item.name,
                quantity: item.quantity || '',
                category: item.category as ShoppingCategory
              }))
            }))
          }
        }
      } catch (error) {
        console.error('Error loading ingredients:', error)
      } finally {
        setLoadingIngredients(false)
      }
    }

    loadIngredients()
  }, [meal?.id])

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
          // Handle ingredient changes
          const newIngredients = formData.ingredients.filter(ing => ing.name.trim())
          const existingNames = existingIngredients.map(item => item.name)

          // Find ingredients to add (new ones not in existing)
          const toAdd = newIngredients.filter(ing => !existingNames.includes(ing.name))

          // Find ingredients to remove (existing ones not in new list)
          const toRemove = existingIngredients.filter(item =>
            !newIngredients.some(ing => ing.name === item.name)
          )

          // Add new ingredients
          for (const ingredient of toAdd) {
            const shoppingItem = await createShoppingItem({
              name: ingredient.name.trim(),
              quantity: ingredient.quantity?.trim() || undefined,
              category: ingredient.category || 'other',
              trip_id: currentTrip.id,
            })

            if (shoppingItem) {
              await linkShoppingItemToMeal(shoppingItem.id, meal.id)
            }
          }

          // Remove deleted ingredients
          for (const item of toRemove) {
            await unlinkShoppingItemFromMeal(item.id, meal.id)
            // Optionally delete the shopping item if it's not linked to any other meals
            // For now, we'll just unlink it
          }

          // Refresh meals to update ingredient counts on meal cards
          await refreshMeals()
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
          const nonEmptyIngredients = formData.ingredients.filter(ing => ing.name.trim())
          for (const ingredient of nonEmptyIngredients) {
            const shoppingItem = await createShoppingItem({
              name: ingredient.name.trim(),
              quantity: ingredient.quantity?.trim() || undefined,
              category: ingredient.category || 'other',
              trip_id: currentTrip.id,
            })

            if (shoppingItem) {
              await linkShoppingItemToMeal(shoppingItem.id, result.id)
            }
          }

          // Refresh meals to update ingredient counts on meal cards
          await refreshMeals()
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

  // Auto-detect category based on ingredient name
  const detectCategory = (name: string): ShoppingCategory => {
    const lowerName = name.toLowerCase()

    // Produce
    if (/tomato|lettuce|salat|kapsas|kurk|paprika|sibul|porgand|kartul|cucumber|pepper|onion|carrot|potato|apple|banana|orange/i.test(lowerName)) {
      return 'produce'
    }
    // Meat & Fish
    if (/meat|chicken|beef|pork|fish|lõhe|kana|liha|salmon|seafood/i.test(lowerName)) {
      return 'meat'
    }
    // Dairy
    if (/milk|cheese|yogurt|piim|juust|cream|butter|või/i.test(lowerName)) {
      return 'dairy'
    }
    // Bakery
    if (/bread|sai|baguette|croissant|roll|bun/i.test(lowerName)) {
      return 'bakery'
    }
    // Pantry
    if (/pasta|rice|riis|oil|õli|flour|jahu|sugar|suhkur|salt|sool|spice|vürts/i.test(lowerName)) {
      return 'pantry'
    }
    // Beverages
    if (/water|vesi|juice|mahl|soda|wine|vein|beer|õlu|coffee|kohv|tea|tee/i.test(lowerName)) {
      return 'beverages'
    }

    return 'other'
  }

  // Ingredient management
  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', quantity: '', category: undefined }]
    })
  }

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    })
  }

  const updateIngredientField = (index: number, field: keyof IngredientInput, value: string) => {
    const newIngredients = [...formData.ingredients]

    if (field === 'name') {
      newIngredients[index].name = value
      // Auto-detect category when name changes, but only if category not manually set
      if (!newIngredients[index].category && value.trim()) {
        newIngredients[index].category = detectCategory(value)
      }
    } else if (field === 'quantity') {
      newIngredients[index].quantity = value
    } else if (field === 'category') {
      newIngredients[index].category = value as ShoppingCategory
    }

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

      {/* Ingredients Section - Show in both create and edit mode */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <Label>Ingredients (Optional)</Label>
          <Button
            type="button"
            onClick={addIngredient}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={submitting || loadingIngredients}
          >
            <Plus size={14} />
            Add Ingredient
          </Button>
        </div>

        {loadingIngredients && meal && (
          <p className="text-sm text-muted-foreground">Loading ingredients...</p>
        )}

        {!loadingIngredients && formData.ingredients.length > 0 && (
          <div className="space-y-3">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => updateIngredientField(index, 'name', e.target.value)}
                    placeholder="e.g., Salmon, Potatoes"
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
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <Input
                    type="text"
                    value={ingredient.quantity || ''}
                    onChange={(e) => updateIngredientField(index, 'quantity', e.target.value)}
                    placeholder="Quantity (e.g., 2 kg)"
                    disabled={submitting}
                    className="text-sm"
                  />
                  <Select
                    value={ingredient.category || 'other'}
                    onValueChange={(value) => updateIngredientField(index, 'category', value)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingIngredients && formData.ingredients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No ingredients added yet. Click "Add Ingredient" to add items to your shopping list.
          </p>
        )}
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
