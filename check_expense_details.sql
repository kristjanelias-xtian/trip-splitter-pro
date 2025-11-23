-- Check the specific expense in detail
SELECT
  id,
  trip_id,
  description,
  amount,
  currency,
  paid_by,
  expense_date,
  category,
  comment,
  distribution,
  created_at,
  updated_at
FROM expenses
WHERE trip_id = '6ea50592-d325-477d-8540-fd703a4f2d3d';

-- Check if any required fields are NULL
SELECT
  COUNT(*) as total,
  COUNT(description) as has_description,
  COUNT(amount) as has_amount,
  COUNT(currency) as has_currency,
  COUNT(paid_by) as has_paid_by,
  COUNT(expense_date) as has_expense_date,
  COUNT(created_at) as has_created_at,
  COUNT(updated_at) as has_updated_at
FROM expenses
WHERE trip_id = '6ea50592-d325-477d-8540-fd703a4f2d3d';
