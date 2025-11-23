-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  tracking_mode TEXT NOT NULL CHECK (tracking_mode IN ('individuals', 'families')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  adults INTEGER NOT NULL CHECK (adults > 0),
  children INTEGER NOT NULL DEFAULT 0
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_adult BOOLEAN NOT NULL DEFAULT true
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  paid_by UUID NOT NULL REFERENCES participants(id),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  comment TEXT,
  distribution JSONB NOT NULL
);

-- Settlements table
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_participant UUID NOT NULL REFERENCES participants(id),
  to_participant UUID NOT NULL REFERENCES participants(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meals table
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  name TEXT NOT NULL,
  description TEXT,
  responsible_participant_id UUID NOT NULL REFERENCES participants(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopping items table
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  quantity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meal shopping items junction table
CREATE TABLE meal_shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  shopping_item_id UUID NOT NULL REFERENCES shopping_items(id) ON DELETE CASCADE,
  quantity TEXT,
  UNIQUE(meal_id, shopping_item_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_families_trip_id ON families(trip_id);
CREATE INDEX idx_participants_trip_id ON participants(trip_id);
CREATE INDEX idx_participants_family_id ON participants(family_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_settlements_trip_id ON settlements(trip_id);
CREATE INDEX idx_meals_trip_id ON meals(trip_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_shopping_items_trip_id ON shopping_items(trip_id);
CREATE INDEX idx_meal_shopping_items_meal_id ON meal_shopping_items(meal_id);
CREATE INDEX idx_meal_shopping_items_shopping_item_id ON meal_shopping_items(shopping_item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_shopping_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (for now, allow all operations - will be refined with authentication)
CREATE POLICY "Allow all operations on trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on settlements" ON settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on meals" ON meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on shopping_items" ON shopping_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on meal_shopping_items" ON meal_shopping_items FOR ALL USING (true) WITH CHECK (true);
