import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConditionalHomePage } from './ConditionalHomePage'
import { buildTrip } from '@/test/factories'

// Track navigation
const mockNavigate = vi.fn()
let mockLocationState: any = {}
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: mockLocationState, key: 'default' }),
  }
})

// Mock AuthContext
const mockAuth = {
  user: null as any,
  userProfile: null,
  session: null,
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateBankDetails: vi.fn(),
}
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

// Mock TripContext
const mockTrips = {
  trips: [] as any[],
  myTripIds: new Set<string>(),
  emailDiscoveredTripIds: new Set<string>(),
  loading: false,
  error: null,
  getTripById: vi.fn(),
  getTripByCode: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  deleteTrip: vi.fn(),
  refreshTrips: vi.fn(),
}
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => mockTrips,
}))

// Mock activeTripDetection
vi.mock('@/lib/activeTripDetection', () => ({
  getActiveTripId: vi.fn(() => null),
}))

// Mock myTripsStorage
vi.mock('@/lib/myTripsStorage', () => ({
  getMyTrips: () => [{ tripCode: 'summer-trip-Ab1234' }],
}))

// Mock HomePage
vi.mock('./HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>,
}))

import { getActiveTripId } from '@/lib/activeTripDetection'

describe('ConditionalHomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockLocationState = {}
    mockAuth.loading = false
    mockTrips.loading = false
    mockTrips.trips = []
    mockTrips.myTripIds = new Set()
    vi.mocked(getActiveTripId).mockReturnValue(null)
    // Default: desktop viewport (no mobile redirect)
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
  })

  it('shows spinner while loading on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    mockTrips.loading = true

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('renders HomePage', async () => {
    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  it('navigates to /t/{code}/quick on mobile with active trip', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    mockAuth.user = { id: 'user-1' } as any
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const trip = buildTrip({
      id: 'trip-1',
      trip_code: 'summer-trip-Ab1234',
      start_date: yesterday.toISOString().slice(0, 10),
      end_date: tomorrow.toISOString().slice(0, 10),
    })
    mockTrips.trips = [trip]
    mockTrips.myTripIds = new Set(['trip-1'])
    vi.mocked(getActiveTripId).mockReturnValue('trip-1')

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/t/summer-trip-Ab1234/quick',
        { replace: true }
      )
    })
  })

  it('does not redirect for upcoming (future) trips', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    mockAuth.user = { id: 'user-1' } as any
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const endMonth = new Date(nextMonth)
    endMonth.setDate(endMonth.getDate() + 7)
    const trip = buildTrip({
      id: 'trip-1',
      trip_code: 'future-trip-Ab1234',
      start_date: nextMonth.toISOString().slice(0, 10),
      end_date: endMonth.toISOString().slice(0, 10),
    })
    mockTrips.trips = [trip]
    mockTrips.myTripIds = new Set(['trip-1'])
    vi.mocked(getActiveTripId).mockReturnValue('trip-1')

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('skips auto-redirect for unauthenticated users', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    mockAuth.user = null
    const trip = buildTrip({
      id: 'trip-1',
      trip_code: 'summer-trip-Ab1234',
    })
    mockTrips.trips = [trip]
    vi.mocked(getActiveTripId).mockReturnValue('trip-1')

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('skips auto-redirect when navigated with fromTrip state', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    mockAuth.user = { id: 'user-1' } as any
    const trip = buildTrip({
      id: 'trip-1',
      trip_code: 'summer-trip-Ab1234',
    })
    mockTrips.trips = [trip]
    vi.mocked(getActiveTripId).mockReturnValue('trip-1')
    mockLocationState = { fromTrip: true }

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('renders HomePage on mobile with no active trip', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    vi.mocked(getActiveTripId).mockReturnValue(null)

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
