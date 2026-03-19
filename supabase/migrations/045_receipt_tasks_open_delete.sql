-- Allow any authenticated user to dismiss/delete and update receipt tasks.
-- Previously restricted to created_by = auth.uid(), which meant only the
-- scanner could dismiss or review. This broke the "Dismiss" and "Review"
-- buttons for other trip members. Matches the trip access model: URL =
-- access token, anyone with access can manage trip data.

-- DELETE: any authenticated user can dismiss
DROP POLICY "Users can delete their own receipt tasks" ON receipt_tasks;

CREATE POLICY "Authenticated users can delete receipt tasks"
  ON receipt_tasks FOR DELETE
  TO authenticated
  USING (true);

-- UPDATE: any authenticated user can review/complete
DROP POLICY "Users can update their own receipt tasks" ON receipt_tasks;

CREATE POLICY "Authenticated users can update receipt tasks"
  ON receipt_tasks FOR UPDATE
  TO authenticated
  USING (true);
