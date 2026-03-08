// SPDX-License-Identifier: Apache-2.0
/**
 * Admin Access Control
 *
 * Admin access is controlled by Supabase user ID.
 * Add user UUIDs here to grant admin access.
 *
 * Find your UUID: Supabase Dashboard → Authentication → Users
 */

const ADMIN_USER_IDS: string[] = [
  '4d07e4a8-9630-4692-93c8-c97896e6fc4d',
]

/**
 * Check if the given user ID has admin access.
 * The user must already be authenticated via Supabase Auth (Google OAuth).
 */
export function isAdminUser(userId: string | undefined): boolean {
  if (!userId) return false
  return ADMIN_USER_IDS.includes(userId)
}
