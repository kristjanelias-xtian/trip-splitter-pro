import { describe, it, expect, beforeEach } from 'vitest'
import { authenticateAdmin, isAdminAuthenticated, logoutAdmin } from './adminAuth'

describe('adminAuth', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('starts unauthenticated', () => {
    expect(isAdminAuthenticated()).toBe(false)
  })

  it('authenticates with correct password', () => {
    // VITE_ADMIN_PASSWORD is set to 'test-admin-pw' in setup.ts
    expect(authenticateAdmin('test-admin-pw')).toBe(true)
    expect(isAdminAuthenticated()).toBe(true)
  })

  it('rejects wrong password', () => {
    expect(authenticateAdmin('wrong')).toBe(false)
    expect(isAdminAuthenticated()).toBe(false)
  })

  it('logs out', () => {
    authenticateAdmin('test-admin-pw')
    logoutAdmin()
    expect(isAdminAuthenticated()).toBe(false)
  })
})
