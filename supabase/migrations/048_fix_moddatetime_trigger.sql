-- Enable moddatetime extension in public schema and create trigger
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON wallet_budgets
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
