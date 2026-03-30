-- Allow anonymous sessions to insert auto_save and overspend entries
-- so that the weekly catch-up logic works when only the child (unauthenticated) uses the app.
DROP POLICY IF EXISTS "Anon can insert auto_save entries" ON wallet_savings;
CREATE POLICY "Anon can insert auto_save entries" ON wallet_savings FOR INSERT
  WITH CHECK (type IN ('auto_save', 'overspend') AND status = 'completed');
