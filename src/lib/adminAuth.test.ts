// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import { isAdminUser } from './adminAuth'

describe('adminAuth', () => {
  it('returns false for undefined userId', () => {
    expect(isAdminUser(undefined)).toBe(false)
  })

  it('returns false for empty string userId', () => {
    expect(isAdminUser('')).toBe(false)
  })

  it('returns false for a non-admin userId', () => {
    expect(isAdminUser('00000000-0000-0000-0000-000000000099')).toBe(false)
  })
})
