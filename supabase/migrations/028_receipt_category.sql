-- Add extracted_category to receipt_tasks for AI-inferred expense category
ALTER TABLE receipt_tasks ADD COLUMN extracted_category TEXT DEFAULT NULL;
