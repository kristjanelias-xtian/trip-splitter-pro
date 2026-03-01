-- One-time backfill: sync linked participants' name + email from Google profiles
-- Linked participants (user_id IS NOT NULL) should always reflect the user's
-- Google display name and email. Prior to PR #502, only user_id was written
-- on link — name and email were left as whatever the organiser originally entered.

UPDATE participants p
SET
  name  = up.display_name,
  email = au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE p.user_id = up.id
  AND (p.name IS DISTINCT FROM up.display_name
       OR p.email IS DISTINCT FROM au.email);
