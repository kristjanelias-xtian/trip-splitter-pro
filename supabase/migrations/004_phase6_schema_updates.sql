-- Phase 6: Meal Planning & Shopping List Schema Updates

-- Update trips table to add start_date and end_date
ALTER TABLE trips ADD COLUMN start_date DATE;
ALTER TABLE trips ADD COLUMN end_date DATE;

-- Populate start_date and end_date from existing date field
UPDATE trips SET start_date = date, end_date = date WHERE start_date IS NULL;

-- Make them NOT NULL after populating
ALTER TABLE trips ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE trips ALTER COLUMN end_date SET NOT NULL;

-- Update meals table
ALTER TABLE meals RENAME COLUMN date TO meal_date;
ALTER TABLE meals RENAME COLUMN name TO title;
ALTER TABLE meals DROP COLUMN IF EXISTS status;
ALTER TABLE meals DROP COLUMN IF EXISTS notes;
ALTER TABLE meals ALTER COLUMN responsible_participant_id DROP NOT NULL;
ALTER TABLE meals ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update shopping_items table
ALTER TABLE shopping_items RENAME COLUMN description TO name;
ALTER TABLE shopping_items ADD COLUMN notes TEXT;
ALTER TABLE shopping_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Remove quantity from meal_shopping_items (not using it for MVP)
ALTER TABLE meal_shopping_items DROP COLUMN IF EXISTS quantity;
ALTER TABLE meal_shopping_items ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
