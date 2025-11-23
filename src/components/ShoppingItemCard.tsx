import { useState } from 'react'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { ShoppingItemWithMeals } from '@/types/shopping'
import { CATEGORY_LABELS } from '@/types/shopping'
import { ShoppingItemForm } from './ShoppingItemForm'

interface ShoppingItemCardProps {
  item: ShoppingItemWithMeals
}

export function ShoppingItemCard({ item }: ShoppingItemCardProps) {
  const { toggleItemCompleted, deleteShoppingItem } = useShoppingContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    await toggleItemCompleted(item.id)
    setToggling(false)
  }

  const handleDelete = async () => {
    const success = await deleteShoppingItem(item.id)
    if (success) {
      setShowDeleteConfirm(false)
    } else {
      alert('Failed to delete item')
    }
  }

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all ${
          item.is_completed
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              item.is_completed
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-neutral'
            } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {item.is_completed && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            )}
          </button>

          {/* Item Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4
                  className={`font-medium ${
                    item.is_completed
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.name}
                  {item.quantity && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({item.quantity})
                    </span>
                  )}
                </h4>

                {/* Category Badge */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {CATEGORY_LABELS[item.category]}
                  </span>

                  {/* Meal Tags */}
                  {item.meal_titles.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.meal_titles.slice(0, 2).map((title, idx) => (
                        <span
                          key={idx}
                          className="inline-block text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                        >
                          {title}
                        </span>
                      ))}
                      {item.meal_titles.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{item.meal_titles.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {item.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowEditForm(true)}
                  className="text-xs text-neutral hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Item
                </h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <ShoppingItemForm
                item={item}
                onSuccess={() => setShowEditForm(false)}
                onCancel={() => setShowEditForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Item?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{item.name}"?
              {item.meal_ids.length > 0 && (
                <span className="block mt-2">
                  This item is linked to {item.meal_ids.length} meal(s).
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
