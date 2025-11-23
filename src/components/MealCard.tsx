import { useState } from 'react'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import type { MealWithIngredients } from '@/types/meal'
import { MealForm } from './MealForm'

interface MealCardProps {
  meal: MealWithIngredients
}

export function MealCard({ meal }: MealCardProps) {
  const { deleteMeal } = useMealContext()
  const { participants } = useParticipantContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const responsiblePerson = meal.responsible_participant_id
    ? participants.find((p) => p.id === meal.responsible_participant_id)
    : null

  const handleDelete = async () => {
    const success = await deleteMeal(meal.id)
    if (success) {
      setShowDeleteConfirm(false)
    } else {
      alert('Failed to delete meal')
    }
  }

  const ingredientProgress =
    meal.ingredients_total > 0
      ? `${meal.ingredients_ready}/${meal.ingredients_total} ready`
      : 'No ingredients added'

  const ingredientPercentage =
    meal.ingredients_total > 0
      ? Math.round((meal.ingredients_ready / meal.ingredients_total) * 100)
      : 0

  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        {/* Meal Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{meal.title}</h4>
            {meal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {meal.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
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

        {/* Responsible Person */}
        {responsiblePerson && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>👤</span>
            <span>{responsiblePerson.name}</span>
          </div>
        )}

        {/* Ingredient Progress */}
        {meal.ingredients_total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Ingredients</span>
              <span>{ingredientProgress}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${ingredientPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Meal
                </h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <MealForm
                meal={meal}
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
              Delete Meal?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{meal.title}"? This will also remove all linked
              shopping items.
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
