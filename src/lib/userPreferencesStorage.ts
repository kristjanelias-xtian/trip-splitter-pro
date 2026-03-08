// SPDX-License-Identifier: Apache-2.0
/**
 * User Preferences localStorage fallback
 * Used for instant reads and as fallback when user is not authenticated.
 *
 * Schema versioning: stored as { version, ...preferences }. Old format
 * (no version field) is treated as version mismatch and cleared —
 * preferences are re-synced from Supabase on next sign-in.
 */

import { logger } from '@/lib/logger'

const PREFERENCES_KEY = 'spl1t:user-preferences'
const OLD_PREFERENCES_KEY = 'trip-splitter:user-preferences'
const SCHEMA_VERSION = 1

function migratePreferencesKey(): void {
  try {
    const old = localStorage.getItem(OLD_PREFERENCES_KEY)
    if (old) {
      localStorage.setItem(PREFERENCES_KEY, old)
      localStorage.removeItem(OLD_PREFERENCES_KEY)
    }
  } catch {}
}

export type AppMode = 'quick' | 'full'

export interface UserPreferencesLocal {
  preferredMode: AppMode
  defaultTripId: string | null
}

interface StoredPreferences extends UserPreferencesLocal {
  version: number
}

function getDefaultMode(): AppMode {
  return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'quick' : 'full'
}

export function getLocalPreferences(): UserPreferencesLocal {
  migratePreferencesKey()
  const defaults: UserPreferencesLocal = {
    preferredMode: getDefaultMode(),
    defaultTripId: null,
  }
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return defaults

    const parsed = JSON.parse(stored)

    // Version check — clear if schema changed or old format (no version field)
    if (!parsed || typeof parsed !== 'object' || parsed.version !== SCHEMA_VERSION) {
      localStorage.removeItem(PREFERENCES_KEY)
      return defaults
    }

    return { ...defaults, preferredMode: parsed.preferredMode, defaultTripId: parsed.defaultTripId }
  } catch {
    return defaults
  }
}

export function setLocalPreferences(prefs: Partial<UserPreferencesLocal>): void {
  try {
    const current = getLocalPreferences()
    const updated: StoredPreferences = { ...current, ...prefs, version: SCHEMA_VERSION }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))
  } catch (error) {
    logger.error('Error saving preferences to localStorage', { error: String(error) })
  }
}
