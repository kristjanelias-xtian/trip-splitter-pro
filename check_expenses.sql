-- Check all expenses in the database
SELECT
  id,
  trip_id,
  description,
  amount,
  paid_by,
  expense_date,
  currency,
  category,
  distribution,
  created_at,
  updated_at
FROM expenses
ORDER BY created_at DESC;

-- Check if there are any NULL values that shouldn't be there
SELECT
  COUNT(*) as total_expenses,
  COUNT(description) as has_description,
  COUNT(expense_date) as has_date,
  COUNT(currency) as has_currency,
  COUNT(created_at) as has_created_at
FROM expenses;
