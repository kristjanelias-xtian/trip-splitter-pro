-- Add receipt grouping columns to wallet_transactions
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS receipt_batch_id UUID,
  ADD COLUMN IF NOT EXISTS vendor TEXT;

-- Index for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_receipt_batch_id
  ON wallet_transactions (receipt_batch_id)
  WHERE receipt_batch_id IS NOT NULL;
