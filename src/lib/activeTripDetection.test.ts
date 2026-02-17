import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getActiveTripId } from './activeTripDetection'
import { buildTrip } from '@/test/factories'

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
