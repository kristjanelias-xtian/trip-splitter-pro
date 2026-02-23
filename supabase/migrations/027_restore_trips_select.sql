-- Migration 027: Restore open SELECT on trips table
--
-- Context: The security migration (026) was intended to keep SELECT open
-- (USING (true)) while restricting INSERT/UPDATE/DELETE. However, the
-- production database ended up with restrictive SELECT policies that broke
-- the app's core access model: the URL is the access token.
--
-- This migration drops ALL SELECT policies on trips and restores a single
-- open SELECT policy. INSERT/UPDATE/DELETE policies from migration 026 are
-- left untouched — those correctly restrict writes to authenticated/creator.
--
-- See CLAUDE.md "Access Model — Core Design Rule" for the full rationale.

-- Drop any SELECT policies that may exist (cover all possible names)
DROP POLICY IF EXISTS "trips_select" ON trips;
DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_select_participant" ON trips;
DROP POLICY IF EXISTS "trips_select_by_code" ON trips;
DROP POLICY IF EXISTS "trips_select_all" ON trips;

-- Restore open SELECT — anyone (authenticated or anonymous) can read trips
CREATE POLICY "trips_select_all" ON trips
  FOR SELECT
  USING (true);
