/**
 * User Preferences localStorage fallback
 * Used for instant reads and as fallback when user is not authenticated
 */

const PREFERENCES_KEY = 'trip-splitter:user-preferences'

export type AppMode = 'quick' | 'full'

export interface UserPreferencesLocal {
  preferredMode: AppMode
  defaultTripId: string | null
}

function getDefaultMode(): AppMode {
  return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'quick' : 'full'
}

export function getLocalPreferences(): UserPreferencesLocal {
  const defaults: UserPreferencesLocal = {
    preferredMode: getDefaultMode(),
    defaultTripId: null,
  }
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return defaults
    return { ...defaults, ...JSON.parse(stored) }
  } catch {
    return defaults
  }
}

export function setLocalPreferences(prefs: Partial<UserPreferencesLocal>): void {
  try {
    const current = getLocalPreferences()
    const updated = { ...current, ...prefs }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving preferences to localStorage:', error)
  }
}
