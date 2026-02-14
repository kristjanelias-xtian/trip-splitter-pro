import { useState, useEffect } from 'react'
import { CalendarDays, ChevronsDown, ChevronsUp } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useActivityContext } from '@/contexts/ActivityContext'
import { useStayContext } from '@/contexts/StayContext'
import type { MealWithIngredients } from '@/types/meal'
import { DayAccordion } from '@/components/DayAccordion'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { generateDateRange, getDayContext, getDayNumber } from '@/lib/dateUtils'

export function PlannerPage() {
  const { currentTrip } = useCurrentTrip()
  const { meals, loading: mealsLoading, getMealsWithIngredients } = useMealContext()
  const { loading: activitiesLoading, getActivitiesForDate } = useActivityContext()
  const { loading: staysLoading, getStayForDate } = useStayContext()
  const [mealsWithIngredients, setMealsWithIngredients] = useState<MealWithIngredients[]>([])
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [allExpanded, setAllExpanded] = useState(false)

  const loading = mealsLoading || activitiesLoading || staysLoading

  useEffect(() => {
    const loadMealsWithIngredients = async () => {
      const data = await getMealsWithIngredients()
      setMealsWithIngredients(data)
    }

    if (meals.length > 0) {
      loadMealsWithIngredients()
    } else {
      setMealsWithIngredients([])
    }
  }, [meals])

  // Set default expanded day (only when trip is active)
  useEffect(() => {
    if (!currentTrip) return

    const tripDates = generateDateRange(currentTrip.start_date, currentTrip.end_date)
    const todayDate = new Date().toISOString().split('T')[0]

    if (tripDates.includes(todayDate)) {
      setExpandedDays([todayDate])
    } else {
      setExpandedDays([])
    }
  }, [currentTrip])

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Day Planner</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to start planning.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tripDates = currentTrip ? generateDateRange(currentTrip.start_date, currentTrip.end_date) : []

  const getMealsForDate = (date: string): MealWithIngredients[] => {
    return mealsWithIngredients.filter((meal) => meal.meal_date === date)
  }

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedDays([])
      setAllExpanded(false)
    } else {
      setExpandedDays(tripDates)
      setAllExpanded(true)
    }
  }

  const handleAccordionChange = (value: string[]) => {
    setExpandedDays(value)
    setAllExpanded(value.length === tripDates.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Day Planner</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentTrip.name} &bull; {tripDates.length} days
          </p>
        </div>

        {!loading && tripDates.length > 0 && (
          <Button
            onClick={handleToggleAll}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {allExpanded ? (
              <>
                <ChevronsUp size={16} />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsDown size={16} />
                Expand All
              </>
            )}
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Loading planner...</p>
          </CardContent>
        </Card>
      )}

      {/* Accordion Day Planner Calendar */}
      {!loading && tripDates.length > 0 && (
        <Accordion
          type="multiple"
          value={expandedDays}
          onValueChange={handleAccordionChange}
          className="space-y-4"
        >
          {tripDates.map((date) => {
            const mealsForDate = getMealsForDate(date)
            const activitiesForDate = getActivitiesForDate(date)
            const dayNumber = getDayNumber(date, currentTrip.start_date)
            const context = getDayContext(date)
            const stay = getStayForDate(date)

            return (
              <DayAccordion
                key={date}
                date={date}
                meals={mealsForDate}
                activities={activitiesForDate}
                dayNumber={dayNumber}
                context={context}
                tripStartDate={currentTrip.start_date}
                stayName={stay?.name}
                onAddMeal={() => {
                  // Handled within TimeSlotGrid component
                }}
              />
            )
          })}
        </Accordion>
      )}

      {/* Empty State */}
      {!loading && tripDates.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalendarDays size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                No days planned yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Start planning activities and meals for your trip by expanding a day
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
