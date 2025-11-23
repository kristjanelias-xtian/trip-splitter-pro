-- Remove legacy date column from trips table
-- start_date and end_date are now used instead

ALTER TABLE trips DROP COLUMN IF EXISTS date;
