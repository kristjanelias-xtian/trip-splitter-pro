-- Check all trips and their associated data counts
SELECT
  t.id as trip_id,
  t.name as trip_name,
  t.tracking_mode,
  (SELECT COUNT(*) FROM families f WHERE f.trip_id = t.id) as family_count,
  (SELECT COUNT(*) FROM participants p WHERE p.trip_id = t.id) as participant_count,
  (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) as expense_count
FROM trips t
ORDER BY t.created_at DESC;

-- Show full trip IDs
SELECT id, name FROM trips ORDER BY created_at DESC;

-- Show families with their trip IDs
SELECT id, trip_id, family_name FROM families;

-- Show expenses with their trip IDs
SELECT id, trip_id, description FROM expenses;
