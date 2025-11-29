-- Add meal type flags for restaurant and everyone-at-home meals
-- Migration 007: Add is_restaurant and everyone_at_home columns to meals table
-- Also adds meal_id foreign key to expenses table for optional linking

-- Add new columns to meals table
ALTER TABLE meals
  ADD COLUMN is_restaurant BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN everyone_at_home BOOLEAN NOT NULL DEFAULT false;

-- Add meal_id foreign key to expenses table (optional linking)
ALTER TABLE expenses
  ADD COLUMN meal_id UUID REFERENCES meals(id) ON DELETE SET NULL;

-- Add index for meal_id lookups (improves query performance)
CREATE INDEX idx_expenses_meal_id ON expenses(meal_id);

-- Add helpful comments explaining the columns
COMMENT ON COLUMN meals.is_restaurant IS 'True if this meal is at a restaurant (may link to expense). Mutually exclusive with everyone_at_home.';
COMMENT ON COLUMN meals.everyone_at_home IS 'True if participants eat separately at home (no group cooking/shopping). Mutually exclusive with is_restaurant.';
COMMENT ON COLUMN expenses.meal_id IS 'Optional link to a restaurant meal. Allows tracking which expense paid for which restaurant meal.';
