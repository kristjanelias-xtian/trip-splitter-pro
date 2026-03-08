// SPDX-License-Identifier: Apache-2.0
/**
 * Hidden Trips Storage
 * Tracks trips the user has hidden from Quick Mode home.
 *
 * Schema versioning: stored as { version, entries }. Old format (plain array)
 * is treated as version mismatch and cleared — hidden trips list rebuilds
 * as the user hides trips again.
 */

import { logger } from '@/lib/logger'

const STORAGE_KEY = 'trip-splitter:hidden-trips'
const MAX_MUTED = 200
const SCHEMA_VERSION = 1

interface StoredHiddenTrips {
  version: number
  entries: string[]
}

export function getHiddenTripCodes(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)

    // Version check — clear if schema changed or old format (plain array)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }

    return (parsed as StoredHiddenTrips).entries ?? []
  } catch {
    return []
  }
}

function saveHiddenTrips(entries: string[]): void {
  const stored: StoredHiddenTrips = { version: SCHEMA_VERSION, entries }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function hideTrip(tripCode: string): void {
  try {
    const hidden = getHiddenTripCodes()
    if (!hidden.includes(tripCode)) {
      hidden.push(tripCode)
    }
    // Trim to keep most recent entries
    const trimmed = hidden.slice(-MAX_MUTED)
    saveHiddenTrips(trimmed)
  } catch (error) {
    logger.error('Error hiding trip', { error: String(error) })
  }
}

export function showTrip(tripCode: string): void {
  try {
    const hidden = getHiddenTripCodes().filter(c => c !== tripCode)
    saveHiddenTrips(hidden)
  } catch (error) {
    logger.error('Error showing trip', { error: String(error) })
  }
}
