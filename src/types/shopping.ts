export type ShoppingCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'pantry'
  | 'frozen'
  | 'beverages'
  | 'snacks'
  | 'other'

export interface ShoppingItem {
  id: string
  trip_id: string
  name: string
  quantity?: string | null // e.g., "2 kg", "3 bottles", "1 pack"
  category: ShoppingCategory
  is_completed: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateShoppingItemInput {
  trip_id: string
  name: string
  quantity?: string
  category?: ShoppingCategory
  notes?: string
  meal_ids?: string[] // Optional: link to meals when creating
}

export interface UpdateShoppingItemInput {
  name?: string
  quantity?: string
  category?: ShoppingCategory
  is_completed?: boolean
  notes?: string
}

export interface MealShoppingLink {
  id: string
  meal_id: string
  shopping_item_id: string
  created_at: string
}

export interface ShoppingItemWithMeals extends ShoppingItem {
  meal_ids: string[] // Array of linked meal IDs
  meal_titles: string[] // Array of meal titles for display
}

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: '🥬 Produce',
  dairy: '🥛 Dairy',
  meat: '🥩 Meat',
  bakery: '🍞 Bakery',
  pantry: '🥫 Pantry',
  frozen: '🧊 Frozen',
  beverages: '🥤 Beverages',
  snacks: '🍿 Snacks',
  other: '📦 Other',
}

export const CATEGORY_ORDER: ShoppingCategory[] = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'pantry',
  'frozen',
  'beverages',
  'snacks',
  'other',
]
