ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_family_id_fkey;
ALTER TABLE participants DROP COLUMN family_id;
