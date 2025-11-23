import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import { useMealContext } from '@/contexts/MealContext'
import type {
  ShoppingItem,
  ShoppingCategory,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
} from '@/types/shopping'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/types/shopping'
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
import { Checkbox } from '@/components/ui/checkbox'
import { fadeInUp } from '@/lib/animations'

interface ShoppingItemFormProps {
  item?: ShoppingItem
  onSuccess: () => void
  onCancel: () => void
}

export function ShoppingItemForm({ item, onSuccess, onCancel }: ShoppingItemFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { createShoppingItem, updateShoppingItem } = useShoppingContext()
  const { meals } = useMealContext()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: item?.name || '',
    quantity: item?.quantity || '',
    category: item?.category || 'other' as ShoppingCategory,
    notes: item?.notes || '',
    meal_ids: [] as string[],
  })

  if (!currentTrip) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Please enter an item name')
      return
    }

    setSubmitting(true)

    try {
      if (item) {
        const updateData: UpdateShoppingItemInput = {
          name: formData.name.trim(),
          quantity: formData.quantity.trim() || undefined,
          category: formData.category,
          notes: formData.notes.trim() || undefined,
        }

        const result = await updateShoppingItem(item.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to update item')
        }
      } else {
        const createData: CreateShoppingItemInput = {
          trip_id: currentTrip.id,
          name: formData.name.trim(),
          quantity: formData.quantity.trim() || undefined,
          category: formData.category,
          notes: formData.notes.trim() || undefined,
          meal_ids: formData.meal_ids.length > 0 ? formData.meal_ids : undefined,
        }

        const result = await createShoppingItem(createData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to create item')
        }
      }
    } catch (error) {
      setError('An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMealToggle = (mealId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      meal_ids: checked
        ? [...prev.meal_ids, mealId]
        : prev.meal_ids.filter((id) => id !== mealId),
    }))
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
        <Label htmlFor="name">Item Name</Label>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Tomatoes"
          required
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity (Optional)</Label>
          <Input
            type="text"
            id="quantity"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="e.g., 2 kg, 3 bottles"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as ShoppingCategory })}
            disabled={submitting}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ORDER.map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Brand preferences, special instructions..."
          rows={2}
          disabled={submitting}
        />
      </div>

      {!item && meals.length > 0 && (
        <div className="space-y-2">
          <Label>Link to Meals (Optional)</Label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-input p-3 space-y-2">
            {meals.map((meal) => (
              <div key={meal.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`meal-${meal.id}`}
                  checked={formData.meal_ids.includes(meal.id)}
                  onCheckedChange={(checked) => handleMealToggle(meal.id, checked as boolean)}
                  disabled={submitting}
                />
                <label
                  htmlFor={`meal-${meal.id}`}
                  className="text-sm text-foreground cursor-pointer flex-1"
                >
                  {meal.title} ({new Date(meal.meal_date).toLocaleDateString()})
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select which meals this ingredient is for
          </p>
        </div>
      )}

      {item && (
        <div className="bg-accent/50 border border-accent rounded-lg p-3">
          <p className="text-sm text-accent-foreground">
            To link this item to meals, manage links from the meal planning page.
          </p>
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
          {submitting ? 'Saving...' : item ? 'Update' : 'Add Item'}
        </Button>
      </div>
    </motion.form>
  )
}
