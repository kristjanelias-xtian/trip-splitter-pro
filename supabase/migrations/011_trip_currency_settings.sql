-- Add currency settings to trips
ALTER TABLE trips ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE trips ADD COLUMN exchange_rates JSONB NOT NULL DEFAULT '{}';
