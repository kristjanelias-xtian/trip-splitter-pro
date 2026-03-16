-- Create kopikas-receipts storage bucket (public read, server-side write only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kopikas-receipts', 'kopikas-receipts', true)
ON CONFLICT (id) DO NOTHING;
