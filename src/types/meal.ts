export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface Meal {
  id: string
  trip_id: string
  meal_date: string // ISO date string (YYYY-MM-DD)
  meal_type: MealType
  title: string
  description?: string | null
  responsible_participant_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateMealInput {
  trip_id: string
  meal_date: string
  meal_type: MealType
  title: string
  description?: string
  responsible_participant_id?: string
}

export interface UpdateMealInput {
  meal_date?: string
  meal_type?: MealType
  title?: string
  description?: string
  responsible_participant_id?: string
}

export interface MealWithIngredients extends Meal {
  shopping_items: string[] // Array of shopping item IDs
  ingredients_ready: number // Count of completed shopping items
  ingredients_total: number // Total count of linked shopping items
}

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🍽️',
  dinner: '🍕',
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}
