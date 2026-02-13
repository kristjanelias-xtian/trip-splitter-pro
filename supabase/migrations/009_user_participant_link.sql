-- Add user_id column to participants table
-- Links a Supabase Auth user to a participant record ("This is me")
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique constraint: one user per trip (a user can only claim one participant per trip)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_user_trip
  ON participants(user_id, trip_id)
  WHERE user_id IS NOT NULL;

-- Index for fast user lookups across trips
CREATE INDEX IF NOT EXISTS idx_participants_user_id
  ON participants(user_id)
  WHERE user_id IS NOT NULL;
