-- Open receipt_tasks SELECT to match the trips access model.
-- Trip URL = access token — anyone who can see a trip should see its receipts.
-- The old FOR ALL policy restricted SELECT to created_by = auth.uid(),
-- hiding the "View receipt" button from every other trip member.

-- Drop the single FOR ALL policy
DROP POLICY "Users can manage their own receipt tasks" ON receipt_tasks;

-- SELECT: open to all (matches trips table pattern)
CREATE POLICY "Anyone can view receipt tasks"
  ON receipt_tasks FOR SELECT
  USING (true);

-- INSERT: authenticated only (created_by must match)
CREATE POLICY "Authenticated users can create receipt tasks"
  ON receipt_tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: creator only
CREATE POLICY "Users can update their own receipt tasks"
  ON receipt_tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- DELETE: creator only
CREATE POLICY "Users can delete their own receipt tasks"
  ON receipt_tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Storage: allow unauthenticated users to read receipt images via signed URLs
-- (existing policy only grants TO authenticated)
CREATE POLICY "Anyone can view receipt images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');
