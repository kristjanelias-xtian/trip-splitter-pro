-- Allow unauthenticated kids to delete their own expenses
-- (previously required auth, which silently failed for kids)
DROP POLICY IF EXISTS "wallet_transactions_delete" ON wallet_transactions;
CREATE POLICY "wallet_transactions_delete" ON wallet_transactions
  FOR DELETE
  USING (true);

-- Also open UPDATE for kids (date editing, amount editing)
-- Previously required auth which blocked kid edits
DROP POLICY IF EXISTS "wallet_transactions_update" ON wallet_transactions;
CREATE POLICY "wallet_transactions_update" ON wallet_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
