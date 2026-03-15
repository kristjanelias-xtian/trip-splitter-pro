// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getActiveTripId, getTripPhase, sortTripBalances } from './activeTripDetection'
import { buildTrip } from '@/test/factories'
import { ParticipantBalance } from '@/services/balanceCalculator'

function makeBalance(balance: number): ParticipantBalance {
  return { id: '1', name: 'Test', totalPaid: 0, totalShare: 0, totalSettled: 0, totalSettledSent: 0, totalSettledReceived: 0, balance, isFamily: false }
}

describe('getActiveTripId', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set "today" to 2025-07-15
    vi.setSystemTime(new Date('2025-07-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for empty trip list', () => {
    expect(getActiveTripId([])).toBeNull()
  })

  it('returns trip that is currently active', () => {
    const trip = buildTrip({
      id: 'active',
      start_date: '2025-07-10',
      end_date: '2025-07-20',
    })
    expect(getActiveTripId([trip])).toBe('active')
  })

  it('picks the soonest-ending trip when multiple are active', () => {
    const trip1 = buildTrip({
      id: 'ends-sooner',
      start_date: '2025-07-10',
      end_date: '2025-07-18',
    })
    const trip2 = buildTrip({
      id: 'ends-later',
      start_date: '2025-07-01',
      end_date: '2025-07-25',
    })
    expect(getActiveTripId([trip1, trip2])).toBe('ends-sooner')
  })

  it('falls back to the nearest upcoming trip when no active trip', () => {
    const trip = buildTrip({
      id: 'upcoming',
      start_date: '2025-07-20',
      end_date: '2025-07-30',
    })
    expect(getActiveTripId([trip])).toBe('upcoming')
  })

  it('picks the nearest upcoming trip among multiple', () => {
    const far = buildTrip({
      id: 'far',
      start_date: '2025-08-10',
      end_date: '2025-08-20',
    })
    const near = buildTrip({
      id: 'near',
      start_date: '2025-07-20',
      end_date: '2025-07-25',
    })
    expect(getActiveTripId([far, near])).toBe('near')
  })

  it('returns null when all trips are in the past', () => {
    const pastTrip = buildTrip({
      id: 'past',
      start_date: '2025-06-01',
      end_date: '2025-06-10',
    })
    expect(getActiveTripId([pastTrip])).toBeNull()
  })

  it('includes start date as active (inclusive start)', () => {
    const trip = buildTrip({
      id: 'starts-today',
      start_date: '2025-07-15',
      end_date: '2025-07-20',
    })
    expect(getActiveTripId([trip])).toBe('starts-today')
  })

  it('includes end date as active (inclusive end)', () => {
    const trip = buildTrip({
      id: 'ends-today',
      start_date: '2025-07-10',
      end_date: '2025-07-15',
    })
    expect(getActiveTripId([trip])).toBe('ends-today')
  })
})

describe('getTripPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set "today" to 2025-07-15
    vi.setSystemTime(new Date('2025-07-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "active" for a trip happening today', () => {
    const trip = buildTrip({ start_date: '2025-07-10', end_date: '2025-07-20' })
    expect(getTripPhase(trip)).toBe('active')
  })

  it('returns "active" on start date (inclusive)', () => {
    const trip = buildTrip({ start_date: '2025-07-15', end_date: '2025-07-20' })
    expect(getTripPhase(trip)).toBe('active')
  })

  it('returns "active" on end date (inclusive)', () => {
    const trip = buildTrip({ start_date: '2025-07-10', end_date: '2025-07-15' })
    expect(getTripPhase(trip)).toBe('active')
  })

  it('returns "ended" the day after end date', () => {
    const trip = buildTrip({ start_date: '2025-07-10', end_date: '2025-07-14' })
    expect(getTripPhase(trip)).toBe('ended')
  })

  it('returns "upcoming" for a future trip', () => {
    const trip = buildTrip({ start_date: '2025-07-20', end_date: '2025-07-25' })
    expect(getTripPhase(trip)).toBe('upcoming')
  })

  it('returns "ended" for a single-day trip that was yesterday', () => {
    const trip = buildTrip({ start_date: '2025-07-14', end_date: '2025-07-14' })
    expect(getTripPhase(trip)).toBe('ended')
  })

  it('returns "active" for a single-day trip that is today', () => {
    const trip = buildTrip({ start_date: '2025-07-15', end_date: '2025-07-15' })
    expect(getTripPhase(trip)).toBe('active')
  })
})

describe('sortTripBalances', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-07-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sorts active before upcoming before ended-unsettled before ended-settled', () => {
    const active = { trip: buildTrip({ id: 'active', start_date: '2025-07-10', end_date: '2025-07-20' }), myBalance: makeBalance(0) }
    const upcoming = { trip: buildTrip({ id: 'upcoming', start_date: '2025-07-20', end_date: '2025-07-30' }), myBalance: null }
    const endedUnsettled = { trip: buildTrip({ id: 'ended-unsettled', start_date: '2025-06-01', end_date: '2025-06-10' }), myBalance: makeBalance(50) }
    const endedSettled = { trip: buildTrip({ id: 'ended-settled', start_date: '2025-05-01', end_date: '2025-05-10' }), myBalance: makeBalance(0) }

    const result = sortTripBalances([endedSettled, upcoming, endedUnsettled, active])
    expect(result.map(r => r.trip.id)).toEqual(['active', 'upcoming', 'ended-unsettled', 'ended-settled'])
  })

  it('sorts active trips by end_date ASC (ending soonest first)', () => {
    const endsSooner = { trip: buildTrip({ id: 'sooner', start_date: '2025-07-10', end_date: '2025-07-18' }), myBalance: null }
    const endsLater = { trip: buildTrip({ id: 'later', start_date: '2025-07-01', end_date: '2025-07-25' }), myBalance: null }

    const result = sortTripBalances([endsLater, endsSooner])
    expect(result.map(r => r.trip.id)).toEqual(['sooner', 'later'])
  })

  it('sorts upcoming trips by start_date ASC (nearest first)', () => {
    const far = { trip: buildTrip({ id: 'far', start_date: '2025-08-10', end_date: '2025-08-20' }), myBalance: null }
    const near = { trip: buildTrip({ id: 'near', start_date: '2025-07-20', end_date: '2025-07-25' }), myBalance: null }

    const result = sortTripBalances([far, near])
    expect(result.map(r => r.trip.id)).toEqual(['near', 'far'])
  })

  it('sorts ended trips by end_date DESC (most recent first)', () => {
    const older = { trip: buildTrip({ id: 'older', start_date: '2025-05-01', end_date: '2025-05-10' }), myBalance: makeBalance(0) }
    const newer = { trip: buildTrip({ id: 'newer', start_date: '2025-06-01', end_date: '2025-06-10' }), myBalance: makeBalance(0) }

    const result = sortTripBalances([older, newer])
    expect(result.map(r => r.trip.id)).toEqual(['newer', 'older'])
  })

  it('treats ended trip with balance below threshold as settled', () => {
    const belowThreshold = { trip: buildTrip({ id: 'below', start_date: '2025-06-01', end_date: '2025-06-10' }), myBalance: makeBalance(0.03) }
    const aboveThreshold = { trip: buildTrip({ id: 'above', start_date: '2025-06-01', end_date: '2025-06-10' }), myBalance: makeBalance(5) }

    const result = sortTripBalances([belowThreshold, aboveThreshold])
    expect(result.map(r => r.trip.id)).toEqual(['above', 'below'])
  })

  it('returns empty array for empty input', () => {
    expect(sortTripBalances([])).toEqual([])
  })

  it('does not mutate the original array', () => {
    const items = [
      { trip: buildTrip({ id: 'b', start_date: '2025-07-20', end_date: '2025-07-25' }), myBalance: null },
      { trip: buildTrip({ id: 'a', start_date: '2025-07-10', end_date: '2025-07-20' }), myBalance: null },
    ]
    const originalFirst = items[0].trip.id
    sortTripBalances(items)
    expect(items[0].trip.id).toBe(originalFirst)
  })
})
