import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useActivityContext } from '@/contexts/ActivityContext'
import { useStayContext } from '@/contexts/StayContext'
import type { MealWithIngredients } from '@/types/meal'
import { PlannerGrid } from '@/components/PlannerGrid'
import { DayDetailSheet } from '@/components/DayDetailSheet'
import { Card, CardContent } from '@/components/ui/card'
import { generateDateRange } from '@/lib/dateUtils'

export function PlannerPage() {
  const { currentTrip } = useCurrentTrip()
  const { meals, loading: mealsLoading, getMealsWithIngredients } = useMealContext()
  const { loading: activitiesLoading, getActivitiesForDate } = useActivityContext()
  const { loading: staysLoading, getStayForDate } = useStayContext()
  const [mealsWithIngredients, setMealsWithIngredients] = useState<MealWithIngredients[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

  const tripDates = generateDateRange(currentTrip.start_date, currentTrip.end_date)

  const getMealsForDate = (date: string): MealWithIngredients[] => {
    return mealsWithIngredients.filter((meal) => meal.meal_date === date)
  }

  const handleGridDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const selectedMeals = selectedDate ? getMealsForDate(selectedDate) : []
  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : []
  const selectedStay = selectedDate ? getStayForDate(selectedDate) : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Day Planner</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentTrip.name} &bull; {tripDates.length} days
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Loading planner...</p>
          </CardContent>
        </Card>
      )}

      {/* Grid Overview */}
      {!loading && tripDates.length > 0 && (
        <PlannerGrid
          tripDates={tripDates}
          getMealsForDate={getMealsForDate}
          getActivitiesForDate={getActivitiesForDate}
          getStayForDate={getStayForDate}
          onDayClick={handleGridDayClick}
        />
      )}

      {/* Day Detail Sheet */}
      <DayDetailSheet
        date={selectedDate}
        onOpenChange={(open) => { if (!open) setSelectedDate(null) }}
        meals={selectedMeals}
        activities={selectedActivities}
        tripStartDate={currentTrip.start_date}
        stayName={selectedStay?.name}
      />

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
                Start planning activities and meals for your trip by tapping a day
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
