-- Add theme preference to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT NULL
  CHECK (theme_preference IS NULL OR theme_preference IN ('light', 'dark', 'system'));
