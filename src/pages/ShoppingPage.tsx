import { useState, useEffect } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import { useMealContext } from '@/contexts/MealContext'
import type { ShoppingItemWithMeals, ShoppingCategory } from '@/types/shopping'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/types/shopping'
import { ShoppingItemCard } from '@/components/ShoppingItemCard'
import { ShoppingItemForm } from '@/components/ShoppingItemForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
        <h2 className="text-2xl font-bold text-foreground">Shopping List</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to view shopping list.
            </p>
          </CardContent>
        </Card>
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Shopping List</h2>
            <p className="text-sm text-muted-foreground mt-1">{currentTrip.name}</p>
          </div>

          <Button onClick={() => setShowAddForm(true)}>
            <Plus size={16} className="mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Items</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{totalItems}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Completed</div>
              <div className="text-2xl font-bold text-positive tabular-nums">
                {completedItems}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Remaining</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{remainingItems}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Progress</div>
              <div className="text-2xl font-bold text-accent tabular-nums">{completionPercentage}%</div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            onClick={() => setViewMode('by-category')}
            variant={viewMode === 'by-category' ? 'default' : 'outline'}
            size="sm"
          >
            By Category
          </Button>
          <Button
            onClick={() => setViewMode('by-meal')}
            variant={viewMode === 'by-meal' ? 'default' : 'outline'}
            size="sm"
          >
            By Meal
          </Button>
          <Button
            onClick={() => setViewMode('general')}
            variant={viewMode === 'general' ? 'default' : 'outline'}
            size="sm"
          >
            General Only
          </Button>
          <Button
            onClick={() => setViewMode('all')}
            variant={viewMode === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All Items
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Loading shopping list...</p>
            </CardContent>
          </Card>
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
                      <h3 className="text-lg font-semibold text-foreground mb-3">
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
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center py-12 text-muted-foreground">
                        No items linked to meals yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  mealsWithItems.map((meal) => {
                    const items = itemsByMeal[meal.id]
                    return (
                      <div key={meal.id}>
                        <h3 className="text-lg font-semibold text-foreground mb-3">
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
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center py-12 text-muted-foreground">
                        No general items. All items are linked to meals.
                      </p>
                    </CardContent>
                  </Card>
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
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">
                      No shopping items yet
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add items to your shopping list or link them to planned meals
                    </p>
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus size={16} className="mr-2" />
                      Add First Item
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Add Shopping Item Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Shopping Item</DialogTitle>
          </DialogHeader>
          <ShoppingItemForm
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
