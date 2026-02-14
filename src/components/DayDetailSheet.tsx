import { Building2 } from 'lucide-react'
import { getDayNumber, getDayContext } from '@/lib/dateUtils'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
}: DayDetailSheetProps) {
  if (!date) return null

  const dayNumber = getDayNumber(date, tripStartDate)
  const context = getDayContext(date)

  return (
    <Sheet open={!!date} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">
            {formatSheetDate(date)}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2 flex-wrap">
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
          </SheetDescription>
        </SheetHeader>

        <TimeSlotGrid date={date} meals={meals} activities={activities} />
      </SheetContent>
    </Sheet>
  )
}
