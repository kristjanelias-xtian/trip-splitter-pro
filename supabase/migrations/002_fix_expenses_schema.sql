-- Fix expenses table schema to match TypeScript interface

-- Rename 'name' to 'description'
ALTER TABLE expenses RENAME COLUMN name TO description;

-- Rename 'date' to 'expense_date'
ALTER TABLE expenses RENAME COLUMN date TO expense_date;

-- Add currency column (default to EUR)
ALTER TABLE expenses ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';

-- Add created_at and updated_at columns
ALTER TABLE expenses ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create an index on expense_date for better query performance
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
