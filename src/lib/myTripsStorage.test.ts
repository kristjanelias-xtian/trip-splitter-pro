import { describe, it, expect, beforeEach } from 'vitest'
import {
  getMyTrips,
  addToMyTrips,
  removeFromMyTrips,
  isInMyTrips,
  clearMyTrips,
  getMyTripsCount,
} from './myTripsStorage'

describe('myTripsStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty array when nothing stored', () => {
    expect(getMyTrips()).toEqual([])
  })

  it('adds a trip', () => {
    addToMyTrips('trip-code-Ab1234', 'My Trip')
    const trips = getMyTrips()
    expect(trips).toHaveLength(1)
    expect(trips[0].tripCode).toBe('trip-code-Ab1234')
    expect(trips[0].tripName).toBe('My Trip')
  })

  it('updates existing trip name and lastAccessed', () => {
    addToMyTrips('trip-code-Ab1234', 'Old Name')

    // Re-add with new name
    addToMyTrips('trip-code-Ab1234', 'New Name')
    const trips = getMyTrips()
    expect(trips).toHaveLength(1)
    expect(trips[0].tripName).toBe('New Name')
  })

  it('removes a trip', () => {
    addToMyTrips('trip-1-Ab1234', 'Trip 1')
    addToMyTrips('trip-2-Ab1234', 'Trip 2')
    removeFromMyTrips('trip-1-Ab1234')
    const trips = getMyTrips()
    expect(trips).toHaveLength(1)
    expect(trips[0].tripCode).toBe('trip-2-Ab1234')
  })

  it('sorts by lastAccessed descending', () => {
    addToMyTrips('trip-old-Ab1234', 'Old')
    addToMyTrips('trip-new-Ab1234', 'New')
    // Re-access the old trip to make it most recent
    addToMyTrips('trip-old-Ab1234', 'Old')
    const trips = getMyTrips()
    expect(trips[0].tripCode).toBe('trip-old-Ab1234')
  })

  it('checks if trip is in list', () => {
    addToMyTrips('trip-code-Ab1234', 'Test')
    expect(isInMyTrips('trip-code-Ab1234')).toBe(true)
    expect(isInMyTrips('other-Ab1234')).toBe(false)
  })

  it('counts trips', () => {
    expect(getMyTripsCount()).toBe(0)
    addToMyTrips('t1-Ab1234', 'T1')
    addToMyTrips('t2-Ab1234', 'T2')
    expect(getMyTripsCount()).toBe(2)
  })

  it('clears all trips', () => {
    addToMyTrips('t1-Ab1234', 'T1')
    clearMyTrips()
    expect(getMyTrips()).toEqual([])
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('trip-splitter:my-trips', '{invalid json}')
    expect(getMyTrips()).toEqual([])
  })
})
