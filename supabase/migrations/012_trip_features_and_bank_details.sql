-- Add feature toggles for meals and shopping per trip
ALTER TABLE trips ADD COLUMN enable_meals BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE trips ADD COLUMN enable_shopping BOOLEAN NOT NULL DEFAULT false;

-- Add bank details to user profiles
ALTER TABLE user_profiles ADD COLUMN bank_account_holder TEXT;
ALTER TABLE user_profiles ADD COLUMN bank_iban TEXT;
