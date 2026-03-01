-- Add nickname column to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Backfill: set nickname to first name for participants with multi-word names
UPDATE participants
SET nickname = split_part(name, ' ', 1)
WHERE nickname IS NULL
  AND name LIKE '% %';
