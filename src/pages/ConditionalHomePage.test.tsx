import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConditionalHomePage } from './ConditionalHomePage'
import { buildTrip } from '@/test/factories'

// Track navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

// Mock UserPreferencesContext
const mockPrefs = {
  mode: 'full' as 'full' | 'quick',
  defaultTripId: null,
  setMode: vi.fn(),
  setDefaultTripId: vi.fn(),
  loading: false,
}
vi.mock('@/contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => mockPrefs,
}))

// Mock TripContext
const mockTrips = {
  trips: [] as any[],
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
  HomePage: () => <div data-testid="home-page">Full Mode Home</div>,
}))

import { getActiveTripId } from '@/lib/activeTripDetection'

describe('ConditionalHomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockAuth.loading = false
    mockPrefs.loading = false
    mockPrefs.mode = 'full'
    mockTrips.loading = false
    mockTrips.trips = []
    vi.mocked(getActiveTripId).mockReturnValue(null)
  })

  it('shows spinner while loading', () => {
    mockAuth.loading = true

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    // Should show loading spinner (svg element with animate-spin class)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('renders HomePage in full mode', async () => {
    mockPrefs.mode = 'full'

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  it('navigates to /t/{code}/quick in quick mode with active trip', async () => {
    mockPrefs.mode = 'quick'
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
      expect(mockNavigate).toHaveBeenCalledWith(
        '/t/summer-trip-Ab1234/quick',
        { replace: true }
      )
    })
  })

  it('navigates to /quick in quick mode with no active trip', async () => {
    mockPrefs.mode = 'quick'
    vi.mocked(getActiveTripId).mockReturnValue(null)

    render(
      <MemoryRouter>
        <ConditionalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/quick', { replace: true })
    })
  })
})
