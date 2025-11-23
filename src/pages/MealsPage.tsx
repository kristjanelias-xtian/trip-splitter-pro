import { useState, useEffect } from 'react'
import { Plus, Sunrise, Sun, Moon, UtensilsCrossed } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import type { MealType, MealWithIngredients } from '@/types/meal'
import { MEAL_TYPE_LABELS } from '@/types/meal'
import { MealCard } from '@/components/MealCard'
import { MealForm } from '@/components/MealForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

  const getMealTypeIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return <Sunrise size={16} className="text-muted-foreground" />
      case 'lunch':
        return <Sun size={16} className="text-muted-foreground" />
      case 'dinner':
        return <Moon size={16} className="text-muted-foreground" />
    }
  }

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Meal Planner</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to plan meals.
            </p>
          </CardContent>
        </Card>
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Meal Planner</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentTrip.name} • {tripDates.length} days
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Loading meals...</p>
            </CardContent>
          </Card>
        )}

        {/* Meal Calendar Grid */}
        {!loading && (
          <div className="space-y-4">
            {tripDates.map((date) => (
              <Card key={date}>
                {/* Date Header */}
                <div className="bg-muted/50 px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">
                    {formatDateHeader(date)}
                  </h3>
                </div>

                {/* Meal Slots */}
                <div className="divide-y divide-border">
                  {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
                    const meal = getMealForSlot(date, mealType)

                    return (
                      <div
                        key={`${date}-${mealType}`}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        {/* Meal Type Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getMealTypeIcon(mealType)}
                            <span className="text-sm font-medium text-foreground">
                              {MEAL_TYPE_LABELS[mealType]}
                            </span>
                          </div>

                          {!meal && (
                            <Button
                              onClick={() => handleAddMeal(date, mealType)}
                              variant="ghost"
                              size="sm"
                            >
                              <Plus size={14} className="mr-1" />
                              Add Meal
                            </Button>
                          )}
                        </div>

                        {/* Meal Card or Empty State */}
                        {meal ? (
                          <MealCard meal={meal} />
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            No meal planned
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && meals.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <UtensilsCrossed size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No meals planned yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Add Meal" on any date to start planning your trip's meals
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Meal Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMealType && selectedDate && (
                <>Add {MEAL_TYPE_LABELS[selectedMealType]} - {formatDateHeader(selectedDate)}</>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && selectedMealType && (
            <MealForm
              initialDate={selectedDate}
              initialMealType={selectedMealType}
              onSuccess={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
