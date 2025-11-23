-- Fix settlements table schema to match TypeScript interface
-- Rename columns and add missing fields

-- Rename columns
ALTER TABLE settlements RENAME COLUMN from_participant TO from_participant_id;
ALTER TABLE settlements RENAME COLUMN to_participant TO to_participant_id;
ALTER TABLE settlements RENAME COLUMN date TO settlement_date;

-- Add missing columns
ALTER TABLE settlements ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE settlements ADD COLUMN note TEXT;
ALTER TABLE settlements ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE settlements ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update settlement_date to be DATE type (already is TIMESTAMPTZ, change to DATE for consistency)
-- Actually, let's keep it as DATE for just the date
ALTER TABLE settlements ALTER COLUMN settlement_date TYPE DATE;
ALTER TABLE settlements ALTER COLUMN settlement_date SET DEFAULT CURRENT_DATE;
