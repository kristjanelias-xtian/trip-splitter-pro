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
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', cellBorder: 'border-amber-200', dot: 'bg-amber-400' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', cellBorder: 'border-sky-200', dot: 'bg-sky-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', cellBorder: 'border-rose-200', dot: 'bg-rose-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', cellBorder: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', cellBorder: 'border-violet-200', dot: 'bg-violet-400' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', cellBorder: 'border-indigo-200', dot: 'bg-indigo-400' },
]

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface PlannerGridProps {
  tripDates: string[]
  getMealsForDate: (date: string) => MealWithIngredients[]
  getActivitiesForDate: (date: string) => Activity[]
  getStayForDate: (date: string) => Stay | undefined
  onDayClick: (date: string) => void
}

/**
 * Organizes trip dates into Mon→Sun week rows.
 * Pads with null for days outside the trip range.
 */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getCalendarWeeks(dates: string[]): (string | null)[][] {
  if (dates.length === 0) return []

  const tripDateSet = new Set(dates)

  // Find the Monday of the week containing the first date
  const firstDate = new Date(dates[0] + 'T00:00:00')
  const dayOfWeek = firstDate.getDay() // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const startMonday = new Date(firstDate)
  startMonday.setDate(firstDate.getDate() + mondayOffset)

  // Find the Sunday of the week containing the last date
  const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00')
  const lastDayOfWeek = lastDate.getDay()
  const sundayOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek
  const endSunday = new Date(lastDate)
  endSunday.setDate(lastDate.getDate() + sundayOffset)

  const weeks: (string | null)[][] = []
  const current = new Date(startMonday)

  while (current <= endSunday) {
    const week: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      const iso = formatLocalDate(current)
      week.push(tripDateSet.has(iso) ? iso : null)
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

/**
 * Maps unique stay IDs to color indices by scanning all trip dates.
 */
function getStayColorMap(
  dates: string[],
  getStayForDate: (date: string) => Stay | undefined
): Map<string, number> {
  const colorMap = new Map<string, number>()
  let colorIdx = 0
  for (const date of dates) {
    const stay = getStayForDate(date)
    if (stay && !colorMap.has(stay.id)) {
      colorMap.set(stay.id, colorIdx % STAY_COLORS.length)
      colorIdx++
    }
  }
  return colorMap
}

function getCalendarDate(date: string): number {
  return new Date(date + 'T00:00:00').getDate()
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
  getMealsForDate,
  getActivitiesForDate,
  getStayForDate,
  onDayClick,
}: PlannerGridProps) {
  const weeks = getCalendarWeeks(tripDates)
  const stayColorMap = getStayColorMap(tripDates, getStayForDate)

  // Build legend: collect unique stays in order + track if there are home days
  const legendStays: { id: string; name: string; colorIdx: number }[] = []
  const seenStayIds = new Set<string>()
  let hasHomeDays = false

  for (const date of tripDates) {
    const stay = getStayForDate(date)
    if (stay) {
      if (!seenStayIds.has(stay.id)) {
        seenStayIds.add(stay.id)
        legendStays.push({
          id: stay.id,
          name: stay.name,
          colorIdx: stayColorMap.get(stay.id)!,
        })
      }
    } else {
      hasHomeDays = true
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-4">
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((d, i) => (
            <div
              key={i}
              className="text-[10px] font-medium text-muted-foreground text-center"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((date, i) => {
            if (!date) {
              return (
                <div
                  key={`empty-${i}`}
                  className="h-20 md:h-24 rounded-lg"
                />
              )
            }

            const stay = getStayForDate(date)
            const colorIdx = stay ? stayColorMap.get(stay.id) : undefined
            const stayColor = colorIdx !== undefined ? STAY_COLORS[colorIdx] : null

            const calendarDate = getCalendarDate(date)
            const context = getDayContext(date)
            const meals = getMealsForDate(date)
            const activities = getActivitiesForDate(date)
            const activityCount = activities.length

            return (
              <button
                key={date}
                type="button"
                onClick={() => onDayClick(date)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 transition-colors relative',
                  'h-20 md:h-24',
                  'hover:bg-accent/50 cursor-pointer',
                  stayColor
                    ? `${stayColor.bg} ${stayColor.cellBorder}`
                    : 'bg-muted/30 border-border',
                  context === 'today' && 'ring-2 ring-primary',
                  context === 'past' && 'opacity-60'
                )}
              >
                <span className="text-xs font-bold leading-none">{calendarDate}</span>
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

        {/* Stay legend */}
        {(legendStays.length > 0 || hasHomeDays) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t">
            {legendStays.map((stay) => (
              <div key={stay.id} className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    STAY_COLORS[stay.colorIdx].dot
                  )}
                />
                <span className="text-[10px] text-muted-foreground">
                  {stay.name}
                </span>
              </div>
            ))}
            {hasHomeDays && (
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground">Home</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
