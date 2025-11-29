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

// Background colors for meal type headers
const MEAL_HEADER_BG = {
  breakfast: 'bg-gold/10 border-gold/20',
  lunch: 'bg-primary/10 border-primary/20',
  dinner: 'bg-secondary/10 border-secondary/20',
}

export function MealGrid({ date, meals }: MealGridProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)

  // Helper to get meal for specific slot
  const getMealForSlot = (mealType: MealType): MealWithIngredients | undefined => {
    return meals.find((m) => m.meal_type === mealType)
  }

  // Format date for dialog title
  const formatDialogDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
    const headerBgClass = MEAL_HEADER_BG[mealType]

    return (
      <Card key={mealType} className="overflow-hidden border-2">
        {/* Meal Type Header - More prominent */}
        <div className={`${headerBgClass} px-4 py-3 border-b-2 border-current`}>
          <div className="flex items-center gap-2">
            <Icon size={24} className={colorClass} />
            <span className="text-base font-semibold">{MEAL_TYPE_LABELS[mealType]}</span>
          </div>
        </div>

        {/* Meal Content */}
        <div className="p-4">
          {meal ? (
            <MealCard meal={meal} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Icon size={40} className={`${colorClass} opacity-20 mb-3`} />
              <p className="text-sm text-muted-foreground mb-4">No meal planned</p>
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
          )}
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Responsive Grid - Increased spacing on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-6">
        {renderMealSlot('breakfast')}
        {renderMealSlot('lunch')}
        {renderMealSlot('dinner')}
      </div>

      {/* Add Meal Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {selectedMealType ? MEAL_TYPE_LABELS[selectedMealType] : 'Meal'} - {formatDialogDate(date)}
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
