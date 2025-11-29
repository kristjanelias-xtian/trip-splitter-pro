import { useState } from 'react'
import { Sunrise, Sun, Moon, Plus } from 'lucide-react'
import { MealWithIngredients, MealType, MEAL_TYPE_LABELS } from '@/types/meal'
import { MealCard } from './MealCard'
import { MealForm } from './MealForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'

export interface MealGridProps {
  date: string
  meals: MealWithIngredients[]
  onAddMeal?: (date: string, mealType: MealType) => void
}

// Icon mapping for meal types
const MEAL_ICONS = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
}

// Color classes for meal types
const MEAL_COLORS = {
  breakfast: 'text-gold',
  lunch: 'text-primary',
  dinner: 'text-secondary',
}

export function MealGrid({ date, meals }: MealGridProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)

  // Helper to get meal for specific slot
  const getMealForSlot = (mealType: MealType): MealWithIngredients | undefined => {
    return meals.find((m) => m.meal_type === mealType)
  }

  // Handle add meal button click
  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType)
    setShowAddForm(true)
  }

  // Render meal slot (either meal card or empty state)
  const renderMealSlot = (mealType: MealType) => {
    const meal = getMealForSlot(mealType)
    const Icon = MEAL_ICONS[mealType]
    const colorClass = MEAL_COLORS[mealType]

    return (
      <div key={mealType} className="flex flex-col">
        {/* Meal Type Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={20} className={colorClass} />
            <span className="text-sm font-medium">{MEAL_TYPE_LABELS[mealType]}</span>
          </div>
        </div>

        {/* Meal Card or Empty State */}
        {meal ? (
          <MealCard meal={meal} />
        ) : (
          <Card className="p-6 border-dashed border-2 hover:border-primary/50 transition-colors">
            <div className="flex flex-col items-center justify-center text-center">
              <Icon size={32} className={`${colorClass} opacity-30 mb-2`} />
              <p className="text-sm text-muted-foreground mb-3">No meal planned</p>
              <Button
                onClick={() => handleAddMeal(mealType)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus size={14} />
                Add {MEAL_TYPE_LABELS[mealType]}
              </Button>
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {renderMealSlot('breakfast')}
        {renderMealSlot('lunch')}
        {renderMealSlot('dinner')}
      </div>

      {/* Add Meal Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {selectedMealType ? MEAL_TYPE_LABELS[selectedMealType] : 'Meal'}
            </DialogTitle>
          </DialogHeader>
          <MealForm
            initialDate={date}
            initialMealType={selectedMealType || undefined}
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
