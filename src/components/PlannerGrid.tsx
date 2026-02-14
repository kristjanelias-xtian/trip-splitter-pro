import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDayContext } from '@/lib/dateUtils'
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

const STAY_COLORS = [
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', cellBorder: 'border-amber-200' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', cellBorder: 'border-sky-200' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', cellBorder: 'border-rose-200' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', cellBorder: 'border-emerald-200' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', cellBorder: 'border-violet-200' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', cellBorder: 'border-indigo-200' },
]

interface PlannerGridProps {
  tripDates: string[]
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

function getCalendarDate(date: string): number {
  return new Date(date + 'T00:00:00').getDate()
}

function getWeekdayAbbr(date: string): string {
  const d = new Date(date + 'T00:00:00')
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

function getStayColorIndex(groups: StayGroup[]): Map<string | null, number> {
  const colorMap = new Map<string | null, number>()
  let colorIdx = 0
  for (const group of groups) {
    if (group.stayId !== null && !colorMap.has(group.stayId)) {
      colorMap.set(group.stayId, colorIdx % STAY_COLORS.length)
      colorIdx++
    }
  }
  return colorMap
}

export function PlannerGrid({
  tripDates,
  getMealsForDate,
  getActivitiesForDate,
  getStayForDate,
  onDayClick,
}: PlannerGridProps) {
  const groups = groupDatesByStay(tripDates, getStayForDate)
  const stayColorMap = getStayColorIndex(groups)

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-3">
          {groups.map((group, groupIdx) => {
            const colorIdx = group.stayId !== null ? stayColorMap.get(group.stayId) : undefined
            const stayColor = colorIdx !== undefined ? STAY_COLORS[colorIdx] : null

            return (
              <div key={groupIdx} className="flex flex-col gap-1 shrink-0">
                {/* Stay label */}
                {group.stayName ? (
                  <div className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded',
                    stayColor ? `${stayColor.bg} ${stayColor.text}` : ''
                  )}>
                    <Building2 size={12} className="shrink-0" />
                    <span className="text-[10px] font-medium truncate">
                      {group.stayName}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium">No stay</span>
                  </div>
                )}

                {/* Day cells row */}
                <div className="flex gap-1">
                  {group.dates.map((date) => {
                    const calendarDate = getCalendarDate(date)
                    const context = getDayContext(date)
                    const meals = getMealsForDate(date)
                    const activities = getActivitiesForDate(date)
                    const weekday = getWeekdayAbbr(date)
                    const activityCount = activities.length

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => onDayClick(date)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 transition-colors relative',
                          'w-12 h-20 md:w-14 md:h-24 shrink-0',
                          'hover:bg-accent/50 cursor-pointer',
                          stayColor
                            ? `${stayColor.bg} ${stayColor.cellBorder}`
                            : 'bg-muted/30 border-border',
                          context === 'today' && 'ring-2 ring-primary',
                          context === 'past' && 'opacity-60'
                        )}
                      >
                        <span className="text-xs font-bold leading-none">{calendarDate}</span>
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
                        {activityCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {activityCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
