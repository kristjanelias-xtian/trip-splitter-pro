import { useState, useEffect, lazy, Suspense } from 'react'
import { CalendarDays, Map } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import { useActivityContext } from '@/contexts/ActivityContext'
import { useStayContext } from '@/contexts/StayContext'
import type { MealWithIngredients } from '@/types/meal'
import type { Activity } from '@/types/activity'
import { PlannerGrid } from '@/components/PlannerGrid'
import { DayDetailSheet } from '@/components/DayDetailSheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateDateRange } from '@/lib/dateUtils'

const StayMap = lazy(() => import('@/components/StayMap'))

export function PlannerPage() {
  const { currentTrip } = useCurrentTrip()
  const { meals, loading: mealsLoading, getMealsWithIngredients } = useMealContext()
  const { loading: activitiesLoading, getActivitiesForDate } = useActivityContext()
  const { stays, loading: staysLoading, getStayForDate, getStaysForDate } = useStayContext()
  const [mealsWithIngredients, setMealsWithIngredients] = useState<MealWithIngredients[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)

  const loading = mealsLoading || activitiesLoading || staysLoading

  const enableMeals = currentTrip?.enable_meals ?? false
  const enableActivities = currentTrip?.enable_activities ?? false

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
    if (!enableMeals) return []
    return mealsWithIngredients.filter((meal) => meal.meal_date === date)
  }

  const getFilteredActivitiesForDate = (date: string): Activity[] => {
    if (!enableActivities) return []
    return getActivitiesForDate(date)
  }

  const handleGridDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const selectedMeals = selectedDate ? getMealsForDate(selectedDate) : []
  const selectedActivities = selectedDate ? getFilteredActivitiesForDate(selectedDate) : []
  const selectedStay = selectedDate ? getStayForDate(selectedDate) : undefined

  // Map: check if any stays have coordinates
  const hasStaysWithCoords = stays.some(s => s.latitude != null && s.longitude != null)

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
          getActivitiesForDate={getFilteredActivitiesForDate}
          getStayForDate={getStayForDate}
          getStaysForDate={getStaysForDate}
          onDayClick={handleGridDayClick}
        />
      )}

      {/* Stay Map */}
      {!loading && hasStaysWithCoords && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap((v) => !v)}
            className="gap-2"
          >
            <Map size={16} />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          {showMap && (
            <Suspense
              fallback={
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center py-8">Loading map...</p>
                  </CardContent>
                </Card>
              }
            >
              <StayMap stays={stays} />
            </Suspense>
          )}
        </div>
      )}

      {/* Day Detail Sheet */}
      <DayDetailSheet
        date={selectedDate}
        onOpenChange={(open) => { if (!open) setSelectedDate(null) }}
        meals={selectedMeals}
        activities={selectedActivities}
        tripStartDate={currentTrip.start_date}
        stayName={selectedStay?.name}
        enableMeals={enableMeals}
        enableActivities={enableActivities}
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
