import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from './TripContext'
import type {
  ShoppingItem,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
  ShoppingItemWithMeals,
} from '@/types/shopping'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ShoppingContextValue {
  shoppingItems: ShoppingItem[]
  loading: boolean
  createShoppingItem: (input: CreateShoppingItemInput) => Promise<ShoppingItem | null>
  updateShoppingItem: (id: string, input: UpdateShoppingItemInput) => Promise<ShoppingItem | null>
  deleteShoppingItem: (id: string) => Promise<boolean>
  toggleItemCompleted: (id: string) => Promise<boolean>
  getShoppingItemsWithMeals: () => Promise<ShoppingItemWithMeals[]>
  linkShoppingItemToMeal: (shoppingItemId: string, mealId: string) => Promise<boolean>
  unlinkShoppingItemFromMeal: (shoppingItemId: string, mealId: string) => Promise<boolean>
  refreshShoppingItems: () => Promise<void>
}

const ShoppingContext = createContext<ShoppingContextValue | undefined>(undefined)

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const fetchShoppingItems = async () => {
    if (!currentTrip) {
      setShoppingItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching shopping items:', error)
        setShoppingItems([])
      } else {
        setShoppingItems((data as ShoppingItem[]) || [])
      }
    } catch (error) {
      console.error('Error fetching shopping items:', error)
      setShoppingItems([])
    } finally {
      setLoading(false)
    }
  }

  const refreshShoppingItems = async () => {
    await fetchShoppingItems()
  }

  // Setup real-time subscription
  useEffect(() => {
    if (!currentTrip) {
      // Cleanup existing channel
      if (channel) {
        supabase.removeChannel(channel)
        setChannel(null)
      }
      setShoppingItems([])
      setLoading(false)
      return
    }

    // Initial fetch
    fetchShoppingItems()

    // Setup real-time subscription for this trip's shopping items
    const shoppingChannel = supabase
      .channel(`shopping_items:trip_id=eq.${currentTrip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopping_items',
          filter: `trip_id=eq.${currentTrip.id}`,
        },
        (payload) => {
          console.log('Shopping item inserted:', payload.new)
          setShoppingItems((prev) => {
            // Check if item already exists (prevent duplicates)
            if (prev.some(item => item.id === payload.new.id)) {
              return prev
            }
            return [...prev, payload.new as ShoppingItem].sort((a, b) => {
              const categoryCompare = a.category.localeCompare(b.category)
              if (categoryCompare !== 0) return categoryCompare
              return a.name.localeCompare(b.name)
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_items',
          filter: `trip_id=eq.${currentTrip.id}`,
        },
        (payload) => {
          console.log('Shopping item updated:', payload.new)
          setShoppingItems((prev) =>
            prev
              .map((item) =>
                item.id === payload.new.id ? (payload.new as ShoppingItem) : item
              )
              .sort((a, b) => {
                const categoryCompare = a.category.localeCompare(b.category)
                if (categoryCompare !== 0) return categoryCompare
                return a.name.localeCompare(b.name)
              })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'shopping_items',
          filter: `trip_id=eq.${currentTrip.id}`,
        },
        (payload) => {
          console.log('Shopping item deleted:', payload.old)
          setShoppingItems((prev) => prev.filter((item) => item.id !== payload.old.id))
        }
      )
      .subscribe()

    setChannel(shoppingChannel)

    // Cleanup on unmount or trip change
    return () => {
      supabase.removeChannel(shoppingChannel)
    }
  }, [tripCode, currentTrip?.id, trips.length])

  const createShoppingItem = async (
    input: CreateShoppingItemInput
  ): Promise<ShoppingItem | null> => {
    try {
      const { meal_ids, ...itemData } = input

      // Set default category if not provided
      const itemToInsert = {
        ...itemData,
        category: itemData.category || 'other',
      }

      const { data, error } = await supabase
        .from('shopping_items')
        .insert([itemToInsert] as any)
        .select()
        .single()

      if (error) {
        console.error('Error creating shopping item:', error)
        return null
      }

      // Link to meals if meal_ids provided
      if (meal_ids && meal_ids.length > 0) {
        const links = meal_ids.map((mealId) => ({
          meal_id: mealId,
          shopping_item_id: (data as any).id,
        }))

        const { error: linkError } = await supabase
          .from('meal_shopping_items')
          .insert(links as any)

        if (linkError) {
          console.error('Error linking shopping item to meals:', linkError)
        }
      }

      // Optimistic update: Add to local state immediately
      const newItem = data as ShoppingItem
      setShoppingItems((prev) => [newItem, ...prev])

      // Note: Real-time subscription will also fire, but optimistic update provides instant feedback
      return newItem
    } catch (error) {
      console.error('Error creating shopping item:', error)
      return null
    }
  }

  const updateShoppingItem = async (
    id: string,
    input: UpdateShoppingItemInput
  ): Promise<ShoppingItem | null> => {
    try {
      const { data, error } = await ((supabase
        .from('shopping_items') as any)
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single())

      if (error) {
        console.error('Error updating shopping item:', error)
        return null
      }

      // Note: Real-time subscription will handle updating state
      return data
    } catch (error) {
      console.error('Error updating shopping item:', error)
      return null
    }
  }

  const deleteShoppingItem = async (id: string): Promise<boolean> => {
    try {
      // First, delete all meal-shopping links
      const { error: linkError } = await supabase
        .from('meal_shopping_items')
        .delete()
        .eq('shopping_item_id', id)

      if (linkError) {
        console.error('Error deleting shopping item links:', linkError)
        return false
      }

      // Optimistic update: Remove from local state immediately
      setShoppingItems((prev) => prev.filter((item) => item.id !== id))

      // Then delete the shopping item
      const { error } = await supabase.from('shopping_items').delete().eq('id', id)

      if (error) {
        console.error('Error deleting shopping item:', error)
        // Rollback optimistic update on error - refetch items
        return false
      }

      // Note: Real-time subscription will also fire, but optimistic update provides instant feedback
      return true
    } catch (error) {
      console.error('Error deleting shopping item:', error)
      return false
    }
  }

  const toggleItemCompleted = async (id: string): Promise<boolean> => {
    const item = shoppingItems.find((i) => i.id === id)
    if (!item) return false

    // Optimistic update
    setShoppingItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, is_completed: !i.is_completed } : i
      )
    )

    const result = await updateShoppingItem(id, {
      is_completed: !item.is_completed,
    })

    // If update failed, revert optimistic update
    if (!result) {
      setShoppingItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, is_completed: item.is_completed } : i
        )
      )
      return false
    }

    return true
  }

  const getShoppingItemsWithMeals = async (): Promise<ShoppingItemWithMeals[]> => {
    if (!currentTrip) return []

    try {
      // Fetch all shopping-meal links for this trip's items
      const { data: links, error } = await supabase
        .from('meal_shopping_items')
        .select(`
          shopping_item_id,
          meal_id,
          meals (
            id,
            title,
            meal_date,
            meal_type
          )
        `)
        .in('shopping_item_id', shoppingItems.map(i => i.id))

      if (error) {
        console.error('Error fetching shopping item meals:', error)
        return shoppingItems.map(item => ({
          ...item,
          meal_ids: [],
          meal_titles: [],
        }))
      }

      // Build lookup map
      const itemMealsMap = new Map<string, { ids: string[], titles: string[] }>()

      links?.forEach((link: any) => {
        if (!itemMealsMap.has(link.shopping_item_id)) {
          itemMealsMap.set(link.shopping_item_id, { ids: [], titles: [] })
        }
        const itemData = itemMealsMap.get(link.shopping_item_id)!
        itemData.ids.push(link.meal_id)
        if (link.meals) {
          itemData.titles.push(link.meals.title)
        }
      })

      // Enhance shopping items with meal data
      return shoppingItems.map(item => {
        const mealData = itemMealsMap.get(item.id)
        return {
          ...item,
          meal_ids: mealData?.ids || [],
          meal_titles: mealData?.titles || [],
        }
      })
    } catch (error) {
      console.error('Error fetching shopping items with meals:', error)
      return shoppingItems.map(item => ({
        ...item,
        meal_ids: [],
        meal_titles: [],
      }))
    }
  }

  const linkShoppingItemToMeal = async (
    shoppingItemId: string,
    mealId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meal_shopping_items')
        .insert([{ meal_id: mealId, shopping_item_id: shoppingItemId }] as any)

      if (error) {
        console.error('Error linking shopping item to meal:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error linking shopping item to meal:', error)
      return false
    }
  }

  const unlinkShoppingItemFromMeal = async (
    shoppingItemId: string,
    mealId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meal_shopping_items')
        .delete()
        .eq('shopping_item_id', shoppingItemId)
        .eq('meal_id', mealId)

      if (error) {
        console.error('Error unlinking shopping item from meal:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error unlinking shopping item from meal:', error)
      return false
    }
  }

  const value: ShoppingContextValue = {
    shoppingItems,
    loading,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    toggleItemCompleted,
    getShoppingItemsWithMeals,
    linkShoppingItemToMeal,
    unlinkShoppingItemFromMeal,
    refreshShoppingItems,
  }

  return (
    <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
  )
}

export function useShoppingContext() {
  const context = useContext(ShoppingContext)
  if (context === undefined) {
    throw new Error('useShoppingContext must be used within a ShoppingProvider')
  }
  return context
}
