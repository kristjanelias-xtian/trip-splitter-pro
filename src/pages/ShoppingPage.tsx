import { useState, useEffect } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import { useMealContext } from '@/contexts/MealContext'
import type { ShoppingItemWithMeals, ShoppingCategory } from '@/types/shopping'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/types/shopping'
import { ShoppingItemCard } from '@/components/ShoppingItemCard'
import { ShoppingItemForm } from '@/components/ShoppingItemForm'

type ViewMode = 'all' | 'by-category' | 'by-meal' | 'general'

export function ShoppingPage() {
  const { currentTrip } = useCurrentTrip()
  const { shoppingItems, loading, getShoppingItemsWithMeals } = useShoppingContext()
  const { meals } = useMealContext()
  const [itemsWithMeals, setItemsWithMeals] = useState<ShoppingItemWithMeals[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('by-category')

  useEffect(() => {
    const loadItemsWithMeals = async () => {
      const data = await getShoppingItemsWithMeals()
      setItemsWithMeals(data)
    }

    if (shoppingItems.length > 0) {
      loadItemsWithMeals()
    } else {
      setItemsWithMeals([])
    }
  }, [shoppingItems])

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-900 dark:text-yellow-200">
            No trip selected. Please select a trip to view shopping list.
          </p>
        </div>
      </div>
    )
  }

  // Stats
  const totalItems = shoppingItems.length
  const completedItems = shoppingItems.filter((item) => item.is_completed).length
  const remainingItems = totalItems - completedItems
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Group items by category
  const itemsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = itemsWithMeals.filter((item) => item.category === category)
    return acc
  }, {} as Record<ShoppingCategory, ShoppingItemWithMeals[]>)

  // Get general items (not linked to any meal)
  const generalItems = itemsWithMeals.filter((item) => item.meal_ids.length === 0)

  // Get unique meals that have shopping items
  const mealsWithItems = meals.filter((meal) =>
    itemsWithMeals.some((item) => item.meal_ids.includes(meal.id))
  )

  // Group items by meal
  const itemsByMeal = mealsWithItems.reduce((acc, meal) => {
    acc[meal.id] = itemsWithMeals.filter((item) => item.meal_ids.includes(meal.id))
    return acc
  }, {} as Record<string, ShoppingItemWithMeals[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentTrip.name}</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-neutral text-white rounded-lg hover:bg-neutral-dark text-sm font-medium"
        >
          + Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Items</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedItems}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{remainingItems}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Progress</div>
          <div className="text-2xl font-bold text-neutral">{completionPercentage}%</div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setViewMode('by-category')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
            viewMode === 'by-category'
              ? 'bg-neutral text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          By Category
        </button>
        <button
          onClick={() => setViewMode('by-meal')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
            viewMode === 'by-meal'
              ? 'bg-neutral text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          By Meal
        </button>
        <button
          onClick={() => setViewMode('general')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
            viewMode === 'general'
              ? 'bg-neutral text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          General Only
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
            viewMode === 'all'
              ? 'bg-neutral text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All Items
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading shopping list...</p>
        </div>
      )}

      {/* Shopping List Content */}
      {!loading && (
        <>
          {/* By Category View */}
          {viewMode === 'by-category' && (
            <div className="space-y-6">
              {CATEGORY_ORDER.map((category) => {
                const items = itemsByCategory[category]
                if (items.length === 0) return null

                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <ShoppingItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* By Meal View */}
          {viewMode === 'by-meal' && (
            <div className="space-y-6">
              {mealsWithItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    No items linked to meals yet
                  </p>
                </div>
              ) : (
                mealsWithItems.map((meal) => {
                  const items = itemsByMeal[meal.id]
                  return (
                    <div key={meal.id}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {meal.title} ({new Date(meal.meal_date).toLocaleDateString()})
                      </h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <ShoppingItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* General Items Only View */}
          {viewMode === 'general' && (
            <div className="space-y-2">
              {generalItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    No general items. All items are linked to meals.
                  </p>
                </div>
              ) : (
                generalItems.map((item) => (
                  <ShoppingItemCard key={item.id} item={item} />
                ))
              )}
            </div>
          )}

          {/* All Items View */}
          {viewMode === 'all' && (
            <div className="space-y-2">
              {itemsWithMeals.map((item) => (
                <ShoppingItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {shoppingItems.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No shopping items yet
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add items to your shopping list or link them to planned meals
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-neutral text-white rounded-lg hover:bg-neutral-dark text-sm font-medium"
              >
                + Add First Item
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Shopping Item Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Shopping Item
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <ShoppingItemForm
                onSuccess={() => setShowAddForm(false)}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
