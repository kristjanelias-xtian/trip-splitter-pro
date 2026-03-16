-- Fix Kopikas category and amount edits not persisting for unauthenticated kids
--
-- Root cause 1: UPDATE policy required auth.uid() IS NOT NULL, but kids are
-- unauthenticated. INSERT was already open (WITH CHECK (true)), but UPDATE
-- silently blocked all changes for kids (0 rows affected, no error).
--
-- Root cause 2: PR #747 added 'snack' category to TypeScript but never updated
-- the DB CHECK constraint, so saving snack would violate the constraint.

-- 1. Allow unauthenticated users (kids) to update their transactions
DROP POLICY "wallet_transactions_update" ON wallet_transactions;
CREATE POLICY "wallet_transactions_update" ON wallet_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 2. Add 'snack' to category CHECK constraint
ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_category_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_category_check CHECK (
  category IN ('sweets', 'snack', 'food', 'clothes', 'beauty', 'fun',
               'school', 'gifts', 'charity', 'other')
  OR category IS NULL
);
