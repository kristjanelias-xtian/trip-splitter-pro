/**
 * Meal-Expense Linking Service
 * Handles the relationship between restaurant meals and expenses
 */

import { supabase } from '@/lib/supabase'
import { Expense } from '@/types/expense'
import { Meal } from '@/types/meal'

/**
 * Links a meal to an expense by updating the expense's meal_id
 * @param mealId - The meal ID to link
 * @param expenseId - The expense ID to link to
 * @returns true if successful, false otherwise
 */
export async function linkMealToExpense(
  mealId: string,
  expenseId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .update({ meal_id: mealId })
      .eq('id', expenseId)

    if (error) {
      console.error('Error linking meal to expense:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error linking meal to expense:', err)
    return false
  }
}

/**
 * Unlinks a meal from its associated expense
 * @param mealId - The meal ID to unlink
 * @returns true if successful, false otherwise
 */
export async function unlinkMealFromExpense(mealId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .update({ meal_id: null })
      .eq('meal_id', mealId)

    if (error) {
      console.error('Error unlinking meal from expense:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error unlinking meal from expense:', err)
    return false
  }
}

/**
 * Gets the expense linked to a specific meal
 * @param mealId - The meal ID to query
 * @returns The linked expense or null if none exists
 */
export async function getExpenseForMeal(
  mealId: string
): Promise<Expense | null> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('meal_id', mealId)
      .single()

    if (error) {
      // No expense found is not an error, return null
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching expense for meal:', error)
      return null
    }

    return data as unknown as Expense
  } catch (err) {
    console.error('Error fetching expense for meal:', err)
    return null
  }
}

/**
 * Gets all meals linked to a specific expense
 * Useful for showing which meals are covered by a single expense
 * @param expenseId - The expense ID to query
 * @returns Array of meals linked to this expense
 */
export async function getMealsForExpense(
  expenseId: string
): Promise<Meal[]> {
  try {
    // First get the expense to find its meal_id
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('meal_id')
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense?.meal_id) {
      return []
    }

    // Then get the meal(s) with that ID
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', expense.meal_id)

    if (error) {
      console.error('Error fetching meals for expense:', error)
      return []
    }

    return (data as unknown as Meal[]) || []
  } catch (err) {
    console.error('Error fetching meals for expense:', err)
    return []
  }
}

/**
 * Validates that an expense can be linked to a meal
 * Only Food category expenses should be linkable
 * @param expense - The expense to validate
 * @returns true if the expense can be linked, false otherwise
 */
export function canLinkExpenseToMeal(expense: Expense): boolean {
  return expense.category === 'Food'
}
