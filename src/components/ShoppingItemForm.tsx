import { useState } from 'react'
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

  const [formData, setFormData] = useState({
    name: item?.name || '',
    quantity: item?.quantity || '',
    category: item?.category || 'other' as ShoppingCategory,
    notes: item?.notes || '',
    meal_ids: [] as string[], // Only used when creating
  })

  if (!currentTrip) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter an item name')
      return
    }

    setSubmitting(true)

    try {
      if (item) {
        // Update existing item
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
          alert('Failed to update item')
        }
      } else {
        // Create new item
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
          alert('Failed to create item')
        }
      }
    } catch (error) {
      console.error('Error submitting shopping item:', error)
      alert('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMealToggle = (mealId: string) => {
    setFormData((prev) => ({
      ...prev,
      meal_ids: prev.meal_ids.includes(mealId)
        ? prev.meal_ids.filter((id) => id !== mealId)
        : [...prev.meal_ids, mealId],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Item Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Tomatoes"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
          required
        />
      </div>

      {/* Quantity */}
      <div>
        <label
          htmlFor="quantity"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Quantity (Optional)
        </label>
        <input
          type="text"
          id="quantity"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          placeholder="e.g., 2 kg, 3 bottles, 1 pack"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
        />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Category *
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value as ShoppingCategory })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
          required
        >
          {CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Brand preferences, special instructions..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent resize-none"
        />
      </div>

      {/* Link to Meals (only when creating) */}
      {!item && meals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Meals (Optional)
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
            {meals.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                No meals planned yet
              </p>
            ) : (
              meals.map((meal) => (
                <label
                  key={meal.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.meal_ids.includes(meal.id)}
                    onChange={() => handleMealToggle(meal.id)}
                    className="rounded border-gray-300 text-neutral focus:ring-neutral"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {meal.title} ({new Date(meal.meal_date).toLocaleDateString()})
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select which meals this ingredient is for
          </p>
        </div>
      )}

      {/* Info for editing */}
      {item && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            💡 To link this item to meals, delete it and recreate with meal links, or manage links
            from the meal planning page.
          </p>
        </div>
      )}

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
          {submitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  )
}
