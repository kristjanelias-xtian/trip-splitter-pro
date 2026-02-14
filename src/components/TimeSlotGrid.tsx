import { useState } from 'react'
import { Sunrise, Sun, Moon, Plus } from 'lucide-react'
import { MealWithIngredients, MealType, MEAL_TYPE_LABELS } from '@/types/meal'
import type { Activity, ActivityTimeSlot } from '@/types/activity'
import { TIME_SLOT_LABELS } from '@/types/activity'
import { MealCard } from './MealCard'
import { MealForm } from './MealForm'
import { ActivityCard } from './ActivityCard'
import { ActivityForm } from './ActivityForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'

export interface TimeSlotGridProps {
  date: string
  meals: MealWithIngredients[]
  activities: Activity[]
}

// Mapping between time slots and meal types
const TIME_SLOT_TO_MEAL: Record<ActivityTimeSlot, MealType> = {
  morning: 'breakfast',
  afternoon: 'lunch',
  evening: 'dinner',
}

// Icons for time slots (reuse meal icons)
const TIME_SLOT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}

// Color classes for time slots (reuse meal colors)
const TIME_SLOT_COLORS = {
  morning: 'text-gold',
  afternoon: 'text-primary',
  evening: 'text-secondary',
}

// Background/border for time slot headers (reuse meal header styles)
const TIME_SLOT_HEADER_BG = {
  morning: 'bg-gold/10 border-gold/20',
  afternoon: 'bg-primary/10 border-primary/20',
  evening: 'bg-secondary/10 border-secondary/20',
}

const TIME_SLOTS: ActivityTimeSlot[] = ['morning', 'afternoon', 'evening']

export function TimeSlotGrid({ date, meals, activities }: TimeSlotGridProps) {
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
    const meal = getMealForSlot(mealType)
    const slotActivities = getActivitiesForSlot(timeSlot)
    const Icon = TIME_SLOT_ICONS[timeSlot]
    const colorClass = TIME_SLOT_COLORS[timeSlot]
    const headerBgClass = TIME_SLOT_HEADER_BG[timeSlot]

    return (
      <Card key={timeSlot} className="overflow-hidden border-2">
        {/* Time Slot Header */}
        <div className={`${headerBgClass} px-4 py-3 border-b-2 border-current`}>
          <div className="flex items-center gap-2">
            <Icon size={24} className={colorClass} />
            <span className="text-base font-semibold">{TIME_SLOT_LABELS[timeSlot]}</span>
          </div>
        </div>

        {/* Content: Activities (left) + Meal (right) — side-by-side on desktop, stacked on mobile */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activities Column */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Activities</h5>
              {slotActivities.length > 0 ? (
                <div className="space-y-2">
                  {slotActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-2">No activities</p>
              )}
              <Button
                onClick={() => handleAddActivity(timeSlot)}
                variant="outline"
                size="sm"
                className="gap-2 w-full"
              >
                <Plus size={14} />
                Add Activity
              </Button>
            </div>

            {/* Meal Column */}
            <div>
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{MEAL_TYPE_LABELS[mealType]}</h5>
              {meal ? (
                <MealCard meal={meal} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <Icon size={32} className={`${colorClass} opacity-20 mb-2`} />
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
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
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
