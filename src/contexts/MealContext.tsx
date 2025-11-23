import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from './TripContext'
import type { Meal, CreateMealInput, UpdateMealInput, MealWithIngredients } from '@/types/meal'

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
  const { currentTrip, tripId } = useCurrentTrip()
  const { trips } = useTripContext()

  const fetchMeals = async () => {
    if (!currentTrip) {
      setMeals([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('meal_date', { ascending: true })
        .order('meal_type', { ascending: true })

      if (error) {
        console.error('Error fetching meals:', error)
        setMeals([])
      } else {
        setMeals((data as Meal[]) || [])
      }
    } catch (error) {
      console.error('Error fetching meals:', error)
      setMeals([])
    } finally {
      setLoading(false)
    }
  }

  const refreshMeals = async () => {
    await fetchMeals()
  }

  useEffect(() => {
    if (tripId && currentTrip) {
      fetchMeals()
    } else {
      setMeals([])
      setLoading(false)
    }
  }, [tripId, currentTrip?.id, trips.length])

  const createMeal = async (input: CreateMealInput): Promise<Meal | null> => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert([input] as any)
        .select()
        .single()

      if (error) {
        console.error('Error creating meal:', error)
        return null
      }

      setMeals((prev) => [...prev, data as Meal].sort((a, b) => {
        const dateCompare = a.meal_date.localeCompare(b.meal_date)
        if (dateCompare !== 0) return dateCompare
        return a.meal_type.localeCompare(b.meal_type)
      }))

      return data as Meal
    } catch (error) {
      console.error('Error creating meal:', error)
      return null
    }
  }

  const updateMeal = async (
    id: string,
    input: UpdateMealInput
  ): Promise<Meal | null> => {
    try {
      const { data, error } = await ((supabase
        .from('meals') as any)
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single())

      if (error) {
        console.error('Error updating meal:', error)
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
      console.error('Error updating meal:', error)
      return null
    }
  }

  const deleteMeal = async (id: string): Promise<boolean> => {
    try {
      // First, delete all meal-shopping links
      const { error: linkError } = await supabase
        .from('meal_shopping_items')
        .delete()
        .eq('meal_id', id)

      if (linkError) {
        console.error('Error deleting meal shopping links:', linkError)
        return false
      }

      // Then delete the meal
      const { error } = await supabase.from('meals').delete().eq('id', id)

      if (error) {
        console.error('Error deleting meal:', error)
        return false
      }

      setMeals((prev) => prev.filter((meal) => meal.id !== id))
      return true
    } catch (error) {
      console.error('Error deleting meal:', error)
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
      const { error } = await supabase
        .from('meal_shopping_items')
        .insert([{ meal_id: mealId, shopping_item_id: shoppingItemId }] as any)

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
      const { error } = await supabase
        .from('meal_shopping_items')
        .delete()
        .eq('meal_id', mealId)
        .eq('shopping_item_id', shoppingItemId)

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
    loading,
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
