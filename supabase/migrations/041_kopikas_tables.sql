-- Enable moddatetime extension (idempotent)
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Kopikas: kid's pocket money tracker tables
--
-- Access model mirrors trip-splitter: wallet_code in the URL is the access
-- token for unauthenticated reads. Authentication gates creation and mutations
-- where noted. Kids (unauthenticated) can log transactions and update pets.

-- ============================================================
-- wallets
-- ============================================================
CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_code TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'EUR',
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallets_created_by ON wallets(created_by);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- SELECT: open (wallet_code in URL is the access token)
CREATE POLICY "wallets_select" ON wallets
  FOR SELECT
  USING (true);

-- INSERT: authenticated users only
CREATE POLICY "wallets_insert" ON wallets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: creator only
CREATE POLICY "wallets_update" ON wallets
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: creator only
CREATE POLICY "wallets_delete" ON wallets
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================
-- wallet_members
-- ============================================================
CREATE TABLE wallet_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  role      TEXT NOT NULL DEFAULT 'parent',
  UNIQUE (wallet_id, user_id)
);

CREATE INDEX idx_wallet_members_wallet_id ON wallet_members(wallet_id);
CREATE INDEX idx_wallet_members_user_id   ON wallet_members(user_id);

ALTER TABLE wallet_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_members_select" ON wallet_members
  FOR SELECT
  USING (true);

CREATE POLICY "wallet_members_insert" ON wallet_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_members_update" ON wallet_members
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_members_delete" ON wallet_members
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- wallet_transactions
-- ============================================================
CREATE TABLE wallet_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id          UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('allowance', 'expense')),
  amount             NUMERIC NOT NULL CHECK (amount > 0),
  description        TEXT,
  category           TEXT CHECK (
                       category IN ('sweets', 'food', 'clothes', 'beauty', 'fun',
                                    'school', 'gifts', 'charity', 'other')
                       OR category IS NULL
                     ),
  receipt_image_path TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_wallet_id   ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_created_at  ON wallet_transactions(created_at);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_transactions_select" ON wallet_transactions
  FOR SELECT
  USING (true);

-- INSERT: open — kids are unauthenticated
CREATE POLICY "wallet_transactions_insert" ON wallet_transactions
  FOR INSERT
  WITH CHECK (true);

-- UPDATE/DELETE: authenticated only (parents correcting entries)
CREATE POLICY "wallet_transactions_update" ON wallet_transactions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_transactions_delete" ON wallet_transactions
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- wallet_pets
-- ============================================================
CREATE TABLE wallet_pets (
  wallet_id            UUID PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  name                 TEXT,
  level                INTEGER NOT NULL DEFAULT 1,
  xp                   INTEGER NOT NULL DEFAULT 0,
  starter_emoji        TEXT NOT NULL,
  last_weekly_xp_check DATE,
  last_streak_xp_check DATE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_pets_select" ON wallet_pets
  FOR SELECT
  USING (true);

-- INSERT/UPDATE: open — kids are unauthenticated; XP is non-critical
CREATE POLICY "wallet_pets_insert" ON wallet_pets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "wallet_pets_update" ON wallet_pets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at via moddatetime extension
CREATE TRIGGER wallet_pets_updated_at
  BEFORE UPDATE ON wallet_pets
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================
-- wallet_category_corrections
-- ============================================================
CREATE TABLE wallet_category_corrections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id          UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  item_description   TEXT NOT NULL,
  original_category  TEXT NOT NULL,
  corrected_category TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_category_corrections_wallet_id ON wallet_category_corrections(wallet_id);

ALTER TABLE wallet_category_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_category_corrections_select" ON wallet_category_corrections
  FOR SELECT
  USING (true);

-- INSERT: open — corrections can be submitted without auth
CREATE POLICY "wallet_category_corrections_insert" ON wallet_category_corrections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "wallet_category_corrections_update" ON wallet_category_corrections
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_category_corrections_delete" ON wallet_category_corrections
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
