import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import type { Meal, CreateMealInput, UpdateMealInput, MealWithIngredients } from '@/types/meal'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'

interface MealContextValue {
  meals: Meal[]
  loading: boolean
  createMeal: (input: CreateMealInput) => Promise<Meal | null>
  updateMeal: (id: string, input: UpdateMealInput) => Promise<Meal | null>
  deleteMeal: (id: string) => Promise<boolean>
  getMealById: (id: string) => Meal | undefined
  getMealsWithIngredients: () => Promise<MealWithIngredients[]>
  linkMealToShoppingItem: (mealId: string, shoppingItemId: string) => Promise<boolean>
  unlinkMealFromShoppingItem: (mealId: string, shoppingItemId: string) => Promise<boolean>
  refreshMeals: () => Promise<void>
}

const MealContext = createContext<MealContextValue | undefined>(undefined)

export function MealProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const { currentTrip, tripCode } = useCurrentTrip()
  const { newSignal, cancel } = useAbortController()

  const fetchMeals = async () => {
    const signal = newSignal()
    if (!currentTrip) {
      setMeals([])
      setInitialLoadDone(true)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('meals')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('meal_date', { ascending: true })
          .order('meal_type', { ascending: true })
          .abortSignal(signal),
        15000,
        'Loading meals timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (error) {
        logger.error('Failed to fetch meals', { trip_id: currentTrip?.id, error: error.message })
        setMeals([])
      } else {
        setMeals((data as Meal[]) || [])
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError' || (signal.aborted)) return
      logger.error('Failed to fetch meals', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      setMeals([])
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
  }

  const refreshMeals = async () => {
    await fetchMeals()
  }

  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchMeals()
    }
    return cancel
  }, [tripCode, currentTrip?.id])

  const createMeal = async (input: CreateMealInput): Promise<Meal | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase
          .from('meals') as any)
          .insert([input])
          .select()
          .single(),
        35000,
        'Creating meal timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to create meal', { trip_id: currentTrip?.id, error: error.message })
        return null
      }

      setMeals((prev) => [...prev, data as Meal].sort((a, b) => {
        const dateCompare = a.meal_date.localeCompare(b.meal_date)
        if (dateCompare !== 0) return dateCompare
        return a.meal_type.localeCompare(b.meal_type)
      }))

      return data as Meal
    } catch (error) {
      logger.error('Failed to create meal', { trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const updateMeal = async (
    id: string,
    input: UpdateMealInput
  ): Promise<Meal | null> => {
    try {
      const { data, error } = await withTimeout<any>(
        ((supabase
          .from('meals') as any)
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()),
        35000,
        'Updating meal timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to update meal', { meal_id: id, trip_id: currentTrip?.id, error: error.message })
        return null
      }

      setMeals((prev) =>
        prev
          .map((meal) => (meal.id === id ? data : meal))
          .sort((a, b) => {
            const dateCompare = a.meal_date.localeCompare(b.meal_date)
            if (dateCompare !== 0) return dateCompare
            return a.meal_type.localeCompare(b.meal_type)
          })
      )

      return data
    } catch (error) {
      logger.error('Failed to update meal', { meal_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const deleteMeal = async (id: string): Promise<boolean> => {
    try {
      // First, delete all meal-shopping links
      const { error: linkError } = await withTimeout(
        supabase
          .from('meal_shopping_items')
          .delete()
          .eq('meal_id', id),
        35000,
        'Deleting meal links timed out. Please check your connection and try again.'
      )

      if (linkError) {
        logger.error('Failed to delete meal shopping links', { meal_id: id, error: linkError.message })
        return false
      }

      // Then delete the meal
      const { error } = await withTimeout(
        supabase.from('meals').delete().eq('id', id),
        35000,
        'Deleting meal timed out. Please check your connection and try again.'
      )

      if (error) {
        logger.error('Failed to delete meal', { meal_id: id, trip_id: currentTrip?.id, error: error.message })
        return false
      }

      setMeals((prev) => prev.filter((meal) => meal.id !== id))
      return true
    } catch (error) {
      logger.error('Failed to delete meal', { meal_id: id, trip_id: currentTrip?.id, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  const getMealById = (id: string): Meal | undefined => {
    return meals.find((meal) => meal.id === id)
  }

  const getMealsWithIngredients = async (): Promise<MealWithIngredients[]> => {
    if (!currentTrip) return []

    try {
      // Fetch all meal-shopping links for this trip's meals
      const { data: links, error } = await supabase
        .from('meal_shopping_items')
        .select(`
          meal_id,
          shopping_item_id,
          shopping_items (
            id,
            is_completed
          )
        `)
        .in('meal_id', meals.map(m => m.id))

      if (error) {
        console.error('Error fetching meal ingredients:', error)
        return meals.map(meal => ({
          ...meal,
          shopping_items: [],
          ingredients_ready: 0,
          ingredients_total: 0,
        }))
      }

      // Build lookup map
      const mealIngredientsMap = new Map<string, { items: string[], completed: number }>()

      links?.forEach((link: any) => {
        if (!mealIngredientsMap.has(link.meal_id)) {
          mealIngredientsMap.set(link.meal_id, { items: [], completed: 0 })
        }
        const mealData = mealIngredientsMap.get(link.meal_id)!
        mealData.items.push(link.shopping_item_id)
        if (link.shopping_items?.is_completed) {
          mealData.completed++
        }
      })

      // Enhance meals with ingredient data
      return meals.map(meal => {
        const ingredientData = mealIngredientsMap.get(meal.id)
        return {
          ...meal,
          shopping_items: ingredientData?.items || [],
          ingredients_ready: ingredientData?.completed || 0,
          ingredients_total: ingredientData?.items.length || 0,
        }
      })
    } catch (error) {
      console.error('Error fetching meals with ingredients:', error)
      return meals.map(meal => ({
        ...meal,
        shopping_items: [],
        ingredients_ready: 0,
        ingredients_total: 0,
      }))
    }
  }

  const linkMealToShoppingItem = async (
    mealId: string,
    shoppingItemId: string
  ): Promise<boolean> => {
    try {
      const { error } = await withTimeout(
        supabase
          .from('meal_shopping_items')
          .insert([{ meal_id: mealId, shopping_item_id: shoppingItemId }] as any),
        35000,
        'Linking meal to shopping item timed out.'
      )

      if (error) {
        console.error('Error linking meal to shopping item:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error linking meal to shopping item:', error)
      return false
    }
  }

  const unlinkMealFromShoppingItem = async (
    mealId: string,
    shoppingItemId: string
  ): Promise<boolean> => {
    try {
      const { error } = await withTimeout(
        supabase
          .from('meal_shopping_items')
          .delete()
          .eq('meal_id', mealId)
          .eq('shopping_item_id', shoppingItemId),
        35000,
        'Unlinking meal from shopping item timed out.'
      )

      if (error) {
        console.error('Error unlinking meal from shopping item:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error unlinking meal from shopping item:', error)
      return false
    }
  }

  const value: MealContextValue = {
    meals,
    loading: loading || (!!currentTrip && !initialLoadDone),
    createMeal,
    updateMeal,
    deleteMeal,
    getMealById,
    getMealsWithIngredients,
    linkMealToShoppingItem,
    unlinkMealFromShoppingItem,
    refreshMeals,
  }

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>
}

export function useMealContext() {
  const context = useContext(MealContext)
  if (context === undefined) {
    throw new Error('useMealContext must be used within a MealProvider')
  }
  return context
}
