-- Migration 026: Tighten RLS on trips table
--
-- Previously: a single "Allow all operations on trips" policy with USING (true)
-- allowed anyone (including anonymous/anon-key holders) to read, insert, update,
-- and delete ALL trips. This migration replaces it with per-operation policies.
--
-- TRADEOFF — SELECT remains USING (true):
-- The app supports shared link access where unauthenticated users navigate to
-- /t/:tripCode. The client (TripContext.tsx) fetches all trips for anonymous
-- users and filters by trip_code client-side. Restricting anonymous SELECT
-- would break this flow. A future improvement is to refactor the anonymous
-- query to filter by trip_code at the DB level, then restrict anonymous SELECT
-- to WHERE trip_code = current_setting('request.path')... or use an RPC.
--
-- What IS fixed:
-- - INSERT restricted to authenticated users
-- - UPDATE restricted to the trip creator
-- - DELETE restricted to the trip creator

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Allow all operations on trips" ON trips;

-- SELECT: all users (preserves shared link / anonymous access)
CREATE POLICY "trips_select" ON trips
  FOR SELECT
  USING (true);

-- INSERT: only authenticated users
CREATE POLICY "trips_insert" ON trips
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: only the trip creator
CREATE POLICY "trips_update" ON trips
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: only the trip creator
CREATE POLICY "trips_delete" ON trips
  FOR DELETE
  USING (auth.uid() = created_by);
