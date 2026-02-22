-- Migration 025: Change enable_activities default to false
-- Previously DEFAULT true caused new groups created programmatically (e.g. QuickScanCreateFlow)
-- to show the Activities planner feature by default, which was undesirable.

ALTER TABLE trips ALTER COLUMN enable_activities SET DEFAULT false;
