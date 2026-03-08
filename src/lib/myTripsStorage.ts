// SPDX-License-Identifier: Apache-2.0
/**
 * My Trips Storage Service
 *
 * Manages localStorage for tracking trips the user has accessed.
 * Stores trip codes in localStorage to create a personalized "My Trips" list.
 *
 * Schema versioning: stored as { version, entries }. If the version doesn't
 * match, stored data is cleared and rebuilt from Supabase on next load.
 * This is acceptable — myTrips is a UI convenience cache, not a source of truth.
 */

const MY_TRIPS_KEY = 'trip-splitter:my-trips'
const MAX_ENTRIES = 100
const SCHEMA_VERSION = 1

export interface MyTripEntry {
  tripCode: string
  tripName: string
  lastAccessed: string // ISO timestamp
  addedAt: string // ISO timestamp
}

interface StoredMyTrips {
  version: number
  entries: MyTripEntry[]
}

/**
 * Get all trips from My Trips list
 */
export function getMyTrips(): MyTripEntry[] {
  try {
    const stored = localStorage.getItem(MY_TRIPS_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)

    // Version check — clear if schema changed or old format (plain array, no version)
    if (!parsed || typeof parsed !== 'object' || parsed.version !== SCHEMA_VERSION) {
      localStorage.removeItem(MY_TRIPS_KEY)
      return []
    }

    const trips = (parsed as StoredMyTrips).entries ?? []
    // Sort by last accessed (most recent first)
    return trips.sort((a, b) =>
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )
  } catch {
    return []
  }
}

function saveMyTrips(entries: MyTripEntry[]): void {
  const stored: StoredMyTrips = { version: SCHEMA_VERSION, entries }
  localStorage.setItem(MY_TRIPS_KEY, JSON.stringify(stored))
}

/**
 * Add or update a trip in My Trips list
 * Automatically called when user accesses a trip via URL
 */
export function addToMyTrips(tripCode: string, tripName: string): void {
  try {
    const trips = getMyTrips()
    const existingIndex = trips.findIndex(t => t.tripCode === tripCode)
    const now = new Date().toISOString()

    if (existingIndex >= 0) {
      // Update existing trip
      trips[existingIndex].tripName = tripName
      trips[existingIndex].lastAccessed = now
    } else {
      // Add new trip
      trips.push({
        tripCode,
        tripName,
        lastAccessed: now,
        addedAt: now,
      })
    }

    // Trim to most recently accessed, keeping MAX_ENTRIES
    const trimmed = trips
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
      .slice(0, MAX_ENTRIES)

    saveMyTrips(trimmed)
  } catch (error) {
    console.error('Error adding trip to My Trips:', error)
  }
}

/**
 * Remove a trip from My Trips list
 */
export function removeFromMyTrips(tripCode: string): void {
  try {
    const trips = getMyTrips()
    const filtered = trips.filter(t => t.tripCode !== tripCode)
    saveMyTrips(filtered)
  } catch (error) {
    console.error('Error removing trip from My Trips:', error)
  }
}

/**
 * Check if a trip is in My Trips list
 */
export function isInMyTrips(tripCode: string): boolean {
  const trips = getMyTrips()
  return trips.some(t => t.tripCode === tripCode)
}

/**
 * Clear all trips from My Trips list
 * (Useful for testing or user preference)
 */
export function clearMyTrips(): void {
  try {
    localStorage.removeItem(MY_TRIPS_KEY)
  } catch (error) {
    console.error('Error clearing My Trips:', error)
  }
}

/**
 * Get the count of trips in My Trips list
 */
export function getMyTripsCount(): number {
  return getMyTrips().length
}
