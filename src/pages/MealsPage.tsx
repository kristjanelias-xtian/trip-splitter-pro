// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { UtensilsCrossed, ChevronsDown, ChevronsUp } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMealContext } from '@/contexts/MealContext'
import type { MealWithIngredients } from '@/types/meal'
import { DayAccordion } from '@/components/DayAccordion'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { generateDateRange, getDayContext, getDayNumber } from '@/lib/dateUtils'

export function MealsPage() {
  const { t } = useTranslation()
  const { currentTrip } = useCurrentTrip()
  const { meals, loading, getMealsWithIngredients } = useMealContext()
  const [mealsWithIngredients, setMealsWithIngredients] = useState<MealWithIngredients[]>([])
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [allExpanded, setAllExpanded] = useState(false)

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

    // Only expand today if it's within trip dates, otherwise leave all collapsed
    if (tripDates.includes(todayDate)) {
      setExpandedDays([todayDate])
    } else {
      setExpandedDays([])
    }
  }, [currentTrip])

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{t('planner.mealPlannerTitle')}</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {t('planner.noTripSelectedMeals')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Generate trip dates
  const tripDates = currentTrip ? generateDateRange(currentTrip.start_date, currentTrip.end_date) : []

  // Group meals by date
  const getMealsForDate = (date: string): MealWithIngredients[] => {
    return mealsWithIngredients.filter((meal) => meal.meal_date === date)
  }

  // Toggle expand/collapse all
  const handleToggleAll = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedDays([])
      setAllExpanded(false)
    } else {
      // Expand all
      setExpandedDays(tripDates)
      setAllExpanded(true)
    }
  }

  // Handle accordion value change
  const handleAccordionChange = (value: string[]) => {
    setExpandedDays(value)
    setAllExpanded(value.length === tripDates.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('planner.mealPlannerTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentTrip.name} • {t('planner.daysCount', { count: tripDates.length })}
          </p>
        </div>

        {/* Expand/Collapse All Button */}
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
                {t('planner.collapseAll')}
              </>
            ) : (
              <>
                <ChevronsDown size={16} />
                {t('planner.expandAll')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">{t('planner.loadingMeals')}</p>
          </CardContent>
        </Card>
      )}

      {/* Accordion Meal Calendar */}
      {!loading && tripDates.length > 0 && (
        <Accordion
          type="multiple"
          value={expandedDays}
          onValueChange={handleAccordionChange}
          className="space-y-4"
        >
          {tripDates.map((date) => {
            const mealsForDate = getMealsForDate(date)
            const dayNumber = getDayNumber(date, currentTrip.start_date)
            const context = getDayContext(date)

            return (
              <DayAccordion
                key={date}
                date={date}
                meals={mealsForDate}
                dayNumber={dayNumber}
                context={context}
                tripStartDate={currentTrip.start_date}
                onAddMeal={() => {
                  // Handled within MealGrid component
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
              <UtensilsCrossed size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                {t('planner.noMealsPlannedYet')}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('planner.noMealsPlannedYetDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
