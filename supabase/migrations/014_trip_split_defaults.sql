-- Add default_split_all column to trips table
-- When true (default), new expenses auto-select all participants/families
ALTER TABLE trips ADD COLUMN default_split_all BOOLEAN NOT NULL DEFAULT true;
