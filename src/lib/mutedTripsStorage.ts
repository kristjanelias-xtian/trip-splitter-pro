/**
 * Muted Trips Storage
 * Tracks trips the user has muted (hidden from Quick Mode home)
 */

const MUTED_KEY = 'trip-splitter:muted-trips'

export function getMutedTripCodes(): string[] {
  try {
    const stored = localStorage.getItem(MUTED_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function muteTrip(tripCode: string): void {
  try {
    const muted = getMutedTripCodes()
    if (!muted.includes(tripCode)) {
      muted.push(tripCode)
      localStorage.setItem(MUTED_KEY, JSON.stringify(muted))
    }
  } catch (error) {
    console.error('Error muting trip:', error)
  }
}

export function unmuteTrip(tripCode: string): void {
  try {
    const muted = getMutedTripCodes().filter(c => c !== tripCode)
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted))
  } catch (error) {
    console.error('Error unmuting trip:', error)
  }
}

export function isTripMuted(tripCode: string): boolean {
  return getMutedTripCodes().includes(tripCode)
}
