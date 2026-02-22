-- Add extracted_date column to receipt_tasks
-- Stores the date extracted from the receipt (ISO date string, e.g. "2026-02-22")
ALTER TABLE receipt_tasks
  ADD COLUMN IF NOT EXISTS extracted_date TEXT DEFAULT NULL;
