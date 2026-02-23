/**
 * Admin Access Control
 *
 * Admin access is controlled by Supabase user ID.
 * Add user UUIDs here to grant admin access.
 *
 * Find your UUID: Supabase Dashboard → Authentication → Users
 */

// TODO: Add your Supabase user UUID before merging.
// Supabase Dashboard → Authentication → Users → copy the UUID for your account.
const ADMIN_USER_IDS: string[] = [
  // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
]

/**
 * Check if the given user ID has admin access.
 * The user must already be authenticated via Supabase Auth (Google OAuth).
 */
export function isAdminUser(userId: string | undefined): boolean {
  if (!userId) return false
  return ADMIN_USER_IDS.includes(userId)
}
