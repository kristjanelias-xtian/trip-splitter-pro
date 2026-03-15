-- Add language preference column to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT NULL
  CHECK (language_preference IS NULL OR language_preference IN ('en', 'et'));
