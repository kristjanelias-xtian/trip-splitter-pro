/**
 * Hidden Trips Storage
 * Tracks trips the user has hidden from Quick Mode home
 */

const STORAGE_KEY = 'trip-splitter:hidden-trips'

export function getHiddenTripCodes(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function hideTrip(tripCode: string): void {
  try {
    const hidden = getHiddenTripCodes()
    if (!hidden.includes(tripCode)) {
      hidden.push(tripCode)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
    }
  } catch (error) {
    console.error('Error hiding trip:', error)
  }
}

export function showTrip(tripCode: string): void {
  try {
    const hidden = getHiddenTripCodes().filter(c => c !== tripCode)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
  } catch (error) {
    console.error('Error showing trip:', error)
  }
}
