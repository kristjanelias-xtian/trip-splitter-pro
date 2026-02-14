-- Trip ownership: track who created each trip
ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill existing trips to Kristjan
UPDATE trips SET created_by = (
  SELECT id FROM user_profiles WHERE email LIKE 'kristjan%' LIMIT 1
) WHERE created_by IS NULL;
