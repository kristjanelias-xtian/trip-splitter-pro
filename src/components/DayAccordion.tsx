import { MealWithIngredients, MealType } from '@/types/meal'
import type { Activity } from '@/types/activity'
import { DateContext } from '@/lib/dateUtils'
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { DayBanner } from './DayBanner'
import { TimeSlotGrid } from './TimeSlotGrid'

export interface DayAccordionProps {
  date: string
  meals: MealWithIngredients[]
  activities?: Activity[]
  dayNumber: number
  context: DateContext
  defaultExpanded?: boolean
  tripStartDate: string
  stayName?: string
  onAddMeal: (date: string, mealType: MealType) => void
}

export function DayAccordion({
  date,
  meals,
  activities = [],
  dayNumber,
  context,
  stayName,
}: DayAccordionProps) {
  return (
    <AccordionItem value={date} className="border-0 mb-4">
      <AccordionTrigger className="hover:no-underline p-0">
        <div className="w-full">
          <DayBanner
            date={date}
            dayNumber={dayNumber}
            context={context}
            meals={meals}
            stayName={stayName}
          />
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="pt-4">
          <TimeSlotGrid
            date={date}
            meals={meals}
            activities={activities}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
