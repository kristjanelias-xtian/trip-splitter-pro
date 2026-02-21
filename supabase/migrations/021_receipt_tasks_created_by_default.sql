-- Set created_by to auth.uid() by default so browser inserts without
-- an explicit created_by never violate the RLS policy.
ALTER TABLE receipt_tasks
  ALTER COLUMN created_by SET DEFAULT auth.uid();
