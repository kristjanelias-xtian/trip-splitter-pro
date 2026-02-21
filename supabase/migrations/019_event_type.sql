-- Add event_type column to trips table
-- Existing rows default to 'trip' (backward compatible)
ALTER TABLE trips
  ADD COLUMN event_type TEXT NOT NULL DEFAULT 'trip'
    CHECK (event_type IN ('trip', 'event'));
