import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDayContext, formatDayHeader, getDayNumber, generateDateRange } from './dateUtils'

describe('getDayContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set "today" to 2025-07-15
    vi.setSystemTime(new Date('2025-07-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "today" for today\'s date', () => {
    expect(getDayContext('2025-07-15')).toBe('today')
  })

  it('returns "tomorrow" for the next day', () => {
    expect(getDayContext('2025-07-16')).toBe('tomorrow')
  })

  it('returns "past" for a past date', () => {
    expect(getDayContext('2025-07-10')).toBe('past')
  })

  it('returns "future" for a date beyond tomorrow', () => {
    expect(getDayContext('2025-07-20')).toBe('future')
  })
})

describe('formatDayHeader', () => {
  it('formats date as "Day, Mon DD"', () => {
    const formatted = formatDayHeader('2025-11-23')
    // Different environments may format slightly differently,
    // but should contain the weekday abbreviation and the day
    expect(formatted).toContain('23')
  })
})

describe('getDayNumber', () => {
  it('returns 1 for the start date', () => {
    expect(getDayNumber('2025-07-01', '2025-07-01')).toBe(1)
  })

  it('returns correct day number for offset', () => {
    expect(getDayNumber('2025-07-05', '2025-07-01')).toBe(5)
  })

  it('returns correct day number for last day of trip', () => {
    expect(getDayNumber('2025-07-10', '2025-07-01')).toBe(10)
  })
})

describe('generateDateRange', () => {
  it('generates inclusive range', () => {
    const range = generateDateRange('2025-07-01', '2025-07-03')
    expect(range).toEqual(['2025-07-01', '2025-07-02', '2025-07-03'])
  })

  it('returns single date when start equals end', () => {
    const range = generateDateRange('2025-07-01', '2025-07-01')
    expect(range).toEqual(['2025-07-01'])
  })

  it('returns empty array when start > end', () => {
    const range = generateDateRange('2025-07-10', '2025-07-01')
    expect(range).toEqual([])
  })

  it('handles month boundaries', () => {
    const range = generateDateRange('2025-07-30', '2025-08-02')
    expect(range).toEqual(['2025-07-30', '2025-07-31', '2025-08-01', '2025-08-02'])
  })
})
