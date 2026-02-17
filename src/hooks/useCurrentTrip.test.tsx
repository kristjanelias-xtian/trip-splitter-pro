import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useCurrentTrip } from './useCurrentTrip'
import { ReactNode } from 'react'
import { buildTrip } from '@/test/factories'

// Mock TripContext
const trips = [
  buildTrip({ id: 'trip-1', trip_code: 'summer-2025-Ab1234', name: 'Summer 2025' }),
]
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({
    trips,
    loading: false,
    getTripByCode: (code: string) => trips.find(t => t.trip_code === code),
  }),
}))

// Mock myTripsStorage
const mockAddToMyTrips = vi.fn()
vi.mock('@/lib/myTripsStorage', () => ({
  addToMyTrips: (...args: any[]) => mockAddToMyTrips(...args),
}))

function createWrapper(route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/t/:tripCode/*" element={children} />
          <Route path="/" element={children} />
        </Routes>
      </MemoryRouter>
    )
  }
}

describe('useCurrentTrip', () => {
  beforeEach(() => {
    mockAddToMyTrips.mockClear()
  })

  it('reads tripCode from params and looks up trip', () => {
    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper('/t/summer-2025-Ab1234/expenses'),
    })

    expect(result.current.tripCode).toBe('summer-2025-Ab1234')
    expect(result.current.currentTrip?.name).toBe('Summer 2025')
  })

  it('calls addToMyTrips when trip is found', () => {
    renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper('/t/summer-2025-Ab1234/expenses'),
    })

    expect(mockAddToMyTrips).toHaveBeenCalledWith('summer-2025-Ab1234', 'Summer 2025')
  })

  it('returns null when no tripCode param', () => {
    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper('/'),
    })

    expect(result.current.tripCode).toBeUndefined()
    expect(result.current.currentTrip).toBeNull()
  })
})
