// SPDX-License-Identifier: Apache-2.0
import { Building2 } from 'lucide-react'
import { getDayNumber, getDayContext } from '@/lib/dateUtils'
import { Badge } from '@/components/ui/badge'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import { TimeSlotGrid } from './TimeSlotGrid'
import type { MealWithIngredients } from '@/types/meal'
import type { Activity } from '@/types/activity'

interface DayDetailSheetProps {
  date: string | null
  onOpenChange: (open: boolean) => void
  meals: MealWithIngredients[]
  activities: Activity[]
  tripStartDate: string
  stayName?: string
  enableMeals?: boolean
  enableActivities?: boolean
}

function formatSheetDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

const CONTEXT_STYLES = {
  today: 'bg-positive/10 border-positive/30 text-positive-dark',
  tomorrow: 'bg-accent/10 border-accent/30 text-accent',
  past: 'bg-muted border-border text-muted-foreground',
  future: 'bg-card border-border text-foreground',
}

export function DayDetailSheet({
  date,
  onOpenChange,
  meals,
  activities,
  tripStartDate,
  stayName,
  enableMeals = true,
  enableActivities = true,
}: DayDetailSheetProps) {
  if (!date) return null

  const dayNumber = getDayNumber(date, tripStartDate)
  const context = getDayContext(date)

  return (
    <ResponsiveOverlay
      open={!!date}
      onClose={() => onOpenChange(false)}
      title={formatSheetDate(date)}
      headerExtra={
        <div className="flex items-center gap-2 flex-wrap px-4 pb-3">
          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-bold">
            Day {dayNumber}
          </Badge>
          <Badge
            variant="outline"
            className={`${CONTEXT_STYLES[context]} capitalize`}
          >
            {context}
          </Badge>
          {stayName && (
            <Badge variant="outline" className="gap-1">
              <Building2 size={12} />
              {stayName}
            </Badge>
          )}
        </div>
      }
    >
      <TimeSlotGrid date={date} meals={meals} activities={activities} enableMeals={enableMeals} enableActivities={enableActivities} />
    </ResponsiveOverlay>
  )
}
