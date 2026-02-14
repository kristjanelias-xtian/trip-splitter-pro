-- Trip Stays table for tracking accommodations
CREATE TABLE stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link TEXT,
  comment TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stays_dates_valid CHECK (check_out_date > check_in_date)
);
CREATE INDEX idx_stays_trip_id ON stays(trip_id);
ALTER TABLE stays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on stays" ON stays FOR ALL USING (true) WITH CHECK (true);

-- Add optional link field to activities
ALTER TABLE activities ADD COLUMN link TEXT;
