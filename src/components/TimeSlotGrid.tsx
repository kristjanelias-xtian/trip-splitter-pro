import { useState } from 'react'
import { Sunrise, Sun, Moon, Plus } from 'lucide-react'
import { MealWithIngredients, MealType, MEAL_TYPE_LABELS } from '@/types/meal'
import type { Activity, ActivityTimeSlot } from '@/types/activity'
import { TIME_SLOT_LABELS } from '@/types/activity'
import { MealCard } from './MealCard'
import { MealForm } from './MealForm'
import { ActivityCard } from './ActivityCard'
import { ActivityForm } from './ActivityForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface TimeSlotGridProps {
  date: string
  meals: MealWithIngredients[]
  activities: Activity[]
  enableMeals?: boolean
  enableActivities?: boolean
}

// Mapping between time slots and meal types
const TIME_SLOT_TO_MEAL: Record<ActivityTimeSlot, MealType> = {
  morning: 'breakfast',
  afternoon: 'lunch',
  evening: 'dinner',
}

// Icons for time slots
const TIME_SLOT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}

// Left accent border colors for timeline feel
const TIME_SLOT_ACCENT = {
  morning: 'border-l-gold',
  afternoon: 'border-l-primary',
  evening: 'border-l-secondary',
}

const TIME_SLOT_ICON_COLORS = {
  morning: 'text-gold',
  afternoon: 'text-primary',
  evening: 'text-secondary',
}

const TIME_SLOTS: ActivityTimeSlot[] = ['morning', 'afternoon', 'evening']

export function TimeSlotGrid({ date, meals, activities, enableMeals = true, enableActivities = true }: TimeSlotGridProps) {
  const [showAddMealForm, setShowAddMealForm] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)
  const [showAddActivityForm, setShowAddActivityForm] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<ActivityTimeSlot | null>(null)

  const getMealForSlot = (mealType: MealType): MealWithIngredients | undefined => {
    return meals.find((m) => m.meal_type === mealType)
  }

  const getActivitiesForSlot = (timeSlot: ActivityTimeSlot): Activity[] => {
    return activities.filter((a) => a.time_slot === timeSlot)
  }

  const formatDialogDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType)
    setShowAddMealForm(true)
  }

  const handleAddActivity = (timeSlot: ActivityTimeSlot) => {
    setSelectedTimeSlot(timeSlot)
    setShowAddActivityForm(true)
  }

  const renderTimeSlotSection = (timeSlot: ActivityTimeSlot) => {
    const mealType = TIME_SLOT_TO_MEAL[timeSlot]
    const meal = enableMeals ? getMealForSlot(mealType) : undefined
    const slotActivities = enableActivities ? getActivitiesForSlot(timeSlot) : []
    const Icon = TIME_SLOT_ICONS[timeSlot]
    const hasContent = meal || slotActivities.length > 0

    const showAddMealButton = enableMeals && !meal
    const showAddActivityButton = enableActivities

    return (
      <div
        key={timeSlot}
        className={`border-l-2 ${TIME_SLOT_ACCENT[timeSlot]} pl-3 py-2`}
      >
        {/* Compact header: icon + label inline */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon size={14} className={TIME_SLOT_ICON_COLORS[timeSlot]} />
          <span className="text-xs font-semibold text-muted-foreground">
            {TIME_SLOT_LABELS[timeSlot]}
          </span>
        </div>

        {/* Items flow vertically */}
        <div className="space-y-1.5">
          {slotActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}

          {meal && <MealCard meal={meal} />}

          {/* Subtle inline add buttons */}
          {(showAddMealButton || showAddActivityButton) && (
            <div className={`flex items-center gap-3 ${hasContent ? 'pt-0.5' : 'py-1'}`}>
              {showAddMealButton && (
                <button
                  type="button"
                  onClick={() => handleAddMeal(mealType)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Add {MEAL_TYPE_LABELS[mealType].toLowerCase()}
                </button>
              )}
              {showAddActivityButton && (
                <button
                  type="button"
                  onClick={() => handleAddActivity(timeSlot)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Add activity
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {TIME_SLOTS.map((timeSlot) => renderTimeSlotSection(timeSlot))}
      </div>

      {/* Add Meal Form Dialog */}
      <Dialog open={showAddMealForm} onOpenChange={setShowAddMealForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {selectedMealType ? MEAL_TYPE_LABELS[selectedMealType] : 'Meal'} - {formatDialogDate(date)}
            </DialogTitle>
          </DialogHeader>
          <MealForm
            initialDate={date}
            initialMealType={selectedMealType || undefined}
            onSuccess={() => setShowAddMealForm(false)}
            onCancel={() => setShowAddMealForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Activity Form Dialog */}
      <Dialog open={showAddActivityForm} onOpenChange={setShowAddActivityForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add Activity - {selectedTimeSlot ? TIME_SLOT_LABELS[selectedTimeSlot] : ''} - {formatDialogDate(date)}
            </DialogTitle>
          </DialogHeader>
          {selectedTimeSlot && (
            <ActivityForm
              date={date}
              timeSlot={selectedTimeSlot}
              onSuccess={() => setShowAddActivityForm(false)}
              onCancel={() => setShowAddActivityForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
