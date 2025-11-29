import { useState, useEffect } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { ShoppingItemWithMeals } from '@/types/shopping'
import { CATEGORY_ORDER } from '@/types/shopping'
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

export function ShoppingPage() {
  const { currentTrip } = useCurrentTrip()
  const { shoppingItems, loading, getShoppingItemsWithMeals } = useShoppingContext()
  const [itemsWithMeals, setItemsWithMeals] = useState<ShoppingItemWithMeals[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

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
          <div className="space-y-2">
            {(() => {
              if (shoppingItems.length === 0) {
                return (
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
                )
              }

              // Sort by category order, then alphabetically by name
              const sortedItems = [...itemsWithMeals].sort((a, b) => {
                const categoryComparison =
                  CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)

                if (categoryComparison !== 0) return categoryComparison

                return a.name.localeCompare(b.name)
              })

              return sortedItems.map((item) => (
                <ShoppingItemCard key={item.id} item={item} />
              ))
            })()}
          </div>
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
