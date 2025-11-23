import { useState, useEffect } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import type { MealType, MealWithIngredients } from '@/types/meal'
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from '@/types/meal'
import { MealCard } from '@/components/MealCard'
import { MealForm } from '@/components/MealForm'

export function MealsPage() {
  const { currentTrip } = useCurrentTrip()
  const { meals, loading, getMealsWithIngredients } = useMealContext()
  const [mealsWithIngredients, setMealsWithIngredients] = useState<MealWithIngredients[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)

  useEffect(() => {
    const loadMealsWithIngredients = async () => {
      const data = await getMealsWithIngredients()
      setMealsWithIngredients(data)
    }

    if (meals.length > 0) {
      loadMealsWithIngredients()
    } else {
      setMealsWithIngredients([])
    }
  }, [meals])

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Planner</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-900 dark:text-yellow-200">
            No trip selected. Please select a trip to plan meals.
          </p>
        </div>
      </div>
    )
  }

  // Generate date range from trip start to end
  const getTripDates = (): string[] => {
    const start = new Date(currentTrip.start_date)
    const end = new Date(currentTrip.end_date)
    const dates: string[] = []

    const current = new Date(start)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  const tripDates = getTripDates()

  // Group meals by date and meal type
  const getMealForSlot = (date: string, mealType: MealType): MealWithIngredients | null => {
    return mealsWithIngredients.find(
      (meal) => meal.meal_date === date && meal.meal_type === mealType
    ) || null
  }

  const handleAddMeal = (date: string, mealType: MealType) => {
    setSelectedDate(date)
    setSelectedMealType(mealType)
    setShowAddForm(true)
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    setSelectedDate(null)
    setSelectedMealType(null)
  }

  const formatDateHeader = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Planner</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentTrip.name} • {tripDates.length} days
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading meals...</p>
        </div>
      )}

      {/* Meal Calendar Grid */}
      {!loading && (
        <div className="space-y-4">
          {tripDates.map((date) => (
            <div
              key={date}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Date Header */}
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {formatDateHeader(date)}
                </h3>
              </div>

              {/* Meal Slots */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
                  const meal = getMealForSlot(date, mealType)

                  return (
                    <div
                      key={`${date}-${mealType}`}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      {/* Meal Type Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{MEAL_TYPE_ICONS[mealType]}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {MEAL_TYPE_LABELS[mealType]}
                          </span>
                        </div>

                        {!meal && (
                          <button
                            onClick={() => handleAddMeal(date, mealType)}
                            className="text-sm text-neutral hover:underline"
                          >
                            + Add Meal
                          </button>
                        )}
                      </div>

                      {/* Meal Card or Empty State */}
                      {meal ? (
                        <MealCard meal={meal} />
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No meal planned
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Meal Form Modal */}
      {showAddForm && selectedDate && selectedMealType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add {MEAL_TYPE_LABELS[selectedMealType]} - {formatDateHeader(selectedDate)}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <MealForm
                initialDate={selectedDate}
                initialMealType={selectedMealType}
                onSuccess={handleCloseForm}
                onCancel={handleCloseForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && meals.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No meals planned yet
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Click "+ Add Meal" on any date to start planning your trip's meals
          </p>
        </div>
      )}
    </div>
  )
}
