/**
 * Admin Authentication Service
 *
 * Simple password-based authentication for admin routes.
 * Uses sessionStorage to persist authentication state during browser session.
 */

const ADMIN_SESSION_KEY = 'spl1t:admin-auth'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

/**
 * Check if user is currently authenticated as admin
 */
export function isAdminAuthenticated(): boolean {
  try {
    const stored = sessionStorage.getItem(ADMIN_SESSION_KEY)
    return stored === 'authenticated'
  } catch (error) {
    console.error('Error checking admin auth:', error)
    return false
  }
}

/**
 * Attempt to authenticate with admin password
 * Returns true if password is correct
 */
export function authenticateAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated')
      return true
    } catch (error) {
      console.error('Error storing admin auth:', error)
      return false
    }
  }
  return false
}

/**
 * Log out admin user
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
  } catch (error) {
    console.error('Error logging out admin:', error)
  }
}

/**
 * Get the admin password from environment (for development/testing only)
 * DO NOT expose this in production UI
 */
export function getAdminPasswordHint(): string {
  if (import.meta.env.DEV) {
    return `Development password: ${ADMIN_PASSWORD}`
  }
  return 'Password is set via VITE_ADMIN_PASSWORD environment variable'
}
