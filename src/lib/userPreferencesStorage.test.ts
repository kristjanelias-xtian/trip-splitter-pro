import { describe, it, expect, beforeEach } from 'vitest'
import { getLocalPreferences, setLocalPreferences } from './userPreferencesStorage'

describe('userPreferencesStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default mode based on window width', () => {
    // jsdom has a default window width that we can check against
    const prefs = getLocalPreferences()
    // Default mode depends on window.innerWidth < 1024
    const expectedMode = window.innerWidth < 1024 ? 'quick' : 'full'
    expect(prefs.preferredMode).toBe(expectedMode)
    expect(prefs.defaultTripId).toBeNull()
  })

  it('merges stored preferences with defaults', () => {
    localStorage.setItem(
      'trip-splitter:user-preferences',
      JSON.stringify({ preferredMode: 'full', defaultTripId: 'trip-123' })
    )
    const prefs = getLocalPreferences()
    expect(prefs.preferredMode).toBe('full')
    expect(prefs.defaultTripId).toBe('trip-123')
  })

  it('sets and persists preferences', () => {
    setLocalPreferences({ preferredMode: 'quick' })
    const prefs = getLocalPreferences()
    expect(prefs.preferredMode).toBe('quick')
  })

  it('merges partial updates without losing other fields', () => {
    setLocalPreferences({ preferredMode: 'full', defaultTripId: 'trip-1' })
    setLocalPreferences({ preferredMode: 'quick' })
    const prefs = getLocalPreferences()
    expect(prefs.preferredMode).toBe('quick')
    expect(prefs.defaultTripId).toBe('trip-1')
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('trip-splitter:user-preferences', 'not-json')
    const prefs = getLocalPreferences()
    expect(prefs).toHaveProperty('preferredMode')
    expect(prefs).toHaveProperty('defaultTripId')
  })
})
