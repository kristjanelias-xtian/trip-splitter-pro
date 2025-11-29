import { MealWithIngredients, MealType } from '@/types/meal'
import { DateContext } from '@/lib/dateUtils'
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { DayBanner } from './DayBanner'
import { MealGrid } from './MealGrid'

export interface DayAccordionProps {
  date: string
  meals: MealWithIngredients[]
  dayNumber: number
  context: DateContext
  defaultExpanded?: boolean
  tripStartDate: string
  onAddMeal: (date: string, mealType: MealType) => void
}

export function DayAccordion({
  date,
  meals,
  dayNumber,
  context,
  onAddMeal,
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
          />
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="pt-4">
          <MealGrid
            date={date}
            meals={meals}
            onAddMeal={onAddMeal}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
