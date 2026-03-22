-- Add purchase tracking columns to wallet_transactions
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS purchase_group_id UUID;

-- Weekly budget config (one per wallet)
CREATE TABLE wallet_budgets (
  wallet_id UUID PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  weekly_amount DECIMAL NOT NULL CHECK (weekly_amount > 0),
  start_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Savings ledger
CREATE TABLE wallet_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto_save', 'withdrawal', 'overspend')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending_approval', 'denied')),
  approved_by UUID,
  week_start DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Savings goals
CREATE TABLE wallet_savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  target_amount DECIMAL NOT NULL CHECK (target_amount > 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: wallet_budgets
ALTER TABLE wallet_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view budgets" ON wallet_budgets FOR SELECT USING (true);
CREATE POLICY "Auth users can insert budgets" ON wallet_budgets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update budgets" ON wallet_budgets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete budgets" ON wallet_budgets FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS: wallet_savings
ALTER TABLE wallet_savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view savings" ON wallet_savings FOR SELECT USING (true);
CREATE POLICY "Anon can request withdrawals" ON wallet_savings FOR INSERT
  WITH CHECK (type = 'withdrawal' AND status = 'pending_approval');
CREATE POLICY "Auth users can insert savings" ON wallet_savings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update savings" ON wallet_savings FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete savings" ON wallet_savings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS: wallet_savings_goals
ALTER TABLE wallet_savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view goals" ON wallet_savings_goals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert goals" ON wallet_savings_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update goals" ON wallet_savings_goals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete goals" ON wallet_savings_goals FOR DELETE USING (true);

-- Auto-update timestamp on wallet_budgets
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON wallet_budgets
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
