import { useState } from 'react'
import { Building2, Grid3x3, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDayContext, getDayNumber } from '@/lib/dateUtils'
import { Card } from '@/components/ui/card'
import type { MealWithIngredients, MealType } from '@/types/meal'
import type { Activity, ActivityTimeSlot } from '@/types/activity'
import type { Stay } from '@/types/stay'

const TIME_SLOT_TO_MEAL: Record<ActivityTimeSlot, MealType> = {
  morning: 'breakfast',
  afternoon: 'lunch',
  evening: 'dinner',
}

const TIME_SLOTS: ActivityTimeSlot[] = ['morning', 'afternoon', 'evening']

const DOT_FILLED_COLORS: Record<ActivityTimeSlot, string> = {
  morning: 'bg-gold',
  afternoon: 'bg-primary',
  evening: 'bg-secondary',
}

interface PlannerGridProps {
  tripDates: string[]
  tripStartDate: string
  getMealsForDate: (date: string) => MealWithIngredients[]
  getActivitiesForDate: (date: string) => Activity[]
  getStayForDate: (date: string) => Stay | undefined
  onDayClick: (date: string) => void
}

interface StayGroup {
  stayId: string | null
  stayName: string | null
  dates: string[]
}

function groupDatesByStay(
  dates: string[],
  getStayForDate: (date: string) => Stay | undefined
): StayGroup[] {
  const groups: StayGroup[] = []

  for (const date of dates) {
    const stay = getStayForDate(date)
    const stayId = stay?.id ?? null
    const stayName = stay?.name ?? null

    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.stayId === stayId) {
      lastGroup.dates.push(date)
    } else {
      groups.push({ stayId, stayName, dates: [date] })
    }
  }

  return groups
}

function getWeekdayAbbr(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function slotHasContent(
  slot: ActivityTimeSlot,
  meals: MealWithIngredients[],
  activities: Activity[]
): boolean {
  const mealType = TIME_SLOT_TO_MEAL[slot]
  return (
    meals.some((m) => m.meal_type === mealType) ||
    activities.some((a) => a.time_slot === slot)
  )
}

export function PlannerGrid({
  tripDates,
  tripStartDate,
  getMealsForDate,
  getActivitiesForDate,
  getStayForDate,
  onDayClick,
}: PlannerGridProps) {
  const [isOpen, setIsOpen] = useState(true)

  const groups = groupDatesByStay(tripDates, getStayForDate)

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Grid3x3 size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Trip Overview</span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {/* Grid content */}
      {isOpen && (
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="flex gap-3">
            {groups.map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-1 shrink-0">
                {/* Stay label */}
                {group.stayName && (
                  <div className="flex items-center gap-1 px-1 mb-1">
                    <Building2 size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      {group.stayName}
                    </span>
                  </div>
                )}

                {/* Day cells row */}
                <div className="flex gap-1">
                  {group.dates.map((date) => {
                    const dayNumber = getDayNumber(date, tripStartDate)
                    const context = getDayContext(date)
                    const meals = getMealsForDate(date)
                    const activities = getActivitiesForDate(date)
                    const weekday = getWeekdayAbbr(date)

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => onDayClick(date)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 transition-colors',
                          'w-12 h-16 md:w-14 md:h-[72px] shrink-0',
                          'hover:bg-accent/50 cursor-pointer',
                          context === 'today' && 'ring-2 ring-primary bg-primary/5',
                          context === 'past' && 'opacity-60'
                        )}
                      >
                        <span className="text-xs font-bold leading-none">{dayNumber}</span>
                        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                          {weekday}
                        </span>
                        <div className="flex gap-1 mt-1.5">
                          {TIME_SLOTS.map((slot) => {
                            const filled = slotHasContent(slot, meals, activities)
                            return (
                              <div
                                key={slot}
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  filled ? DOT_FILLED_COLORS[slot] : 'bg-muted-foreground/20'
                                )}
                              />
                            )
                          })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
