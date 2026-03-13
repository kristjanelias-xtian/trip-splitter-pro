-- Add toggle for settlement reminders (nudge banners + email reminders)
ALTER TABLE trips ADD COLUMN enable_settlement_reminders BOOLEAN DEFAULT true;
