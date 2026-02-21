-- Prevent two participants in the same trip from sharing an email.
-- NULLs are excluded automatically (PostgreSQL treats NULLs as distinct in unique indexes).
-- lower() ensures case-insensitive uniqueness (john@x.com = John@X.com).
CREATE UNIQUE INDEX participants_trip_email_unique
  ON participants (trip_id, lower(email))
  WHERE email IS NOT NULL;
