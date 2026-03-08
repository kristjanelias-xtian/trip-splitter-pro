// SPDX-License-Identifier: Apache-2.0
import { Building2, X } from 'lucide-react'
import { getDayNumber, getDayContext } from '@/lib/dateUtils'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
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
  const scrollRef = useIOSScrollFix()

  if (!date) return null

  const dayNumber = getDayNumber(date, tripStartDate)
  const context = getDayContext(date)

  return (
    <Sheet open={!!date} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
      >
        {/* Sticky header — never scrolls */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">
              {formatSheetDate(date)}
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
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
        </div>

        {/* Scrollable content — only this scrolls */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <TimeSlotGrid date={date} meals={meals} activities={activities} enableMeals={enableMeals} enableActivities={enableActivities} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
