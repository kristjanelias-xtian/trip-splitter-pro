-- Add created_by column to settlements so we can gate deletion in the UI
ALTER TABLE settlements ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Backfill existing settlements to trip creator
UPDATE settlements s
SET created_by = (SELECT created_by FROM trips WHERE id = s.trip_id);
