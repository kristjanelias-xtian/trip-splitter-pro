-- Allow admin users to delete any trip (in addition to the creator).
--
-- Admin UUIDs here MUST stay in sync with src/lib/adminAuth.ts ADMIN_USER_IDS.
-- If you add/remove an admin there, update this policy too.

DROP POLICY IF EXISTS "trips_delete" ON trips;

CREATE POLICY "trips_delete" ON trips
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR auth.uid() IN ('4d07e4a8-9630-4692-93c8-c97896e6fc4d')
  );
