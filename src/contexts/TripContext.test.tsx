import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TripProvider, useTripContext } from './TripContext'
import { buildTrip } from '@/test/factories'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

const mockAuth = vi.hoisted(() => ({
  user: null as any,
  userProfile: null,
  session: null,
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateBankDetails: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/lib/tripCodeGenerator', () => ({
  generateTripCode: () => 'test-trip-Abc123',
}))

function TestConsumer() {
  const { trips, loading, error, getTripById, getTripByCode } = useTripContext()
  const trip1 = getTripById('trip-1')
  const tripByCode = getTripByCode('summer-trip-Ab1234')
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? 'null'}</span>
      <span data-testid="count">{trips.length}</span>
      <span data-testid="trip1">{trip1?.name ?? 'null'}</span>
      <span data-testid="tripByCode">{tripByCode?.name ?? 'null'}</span>
    </div>
  )
}

describe('TripContext', () => {
  beforeEach(() => {
    mockAuth.loading = false
    mockSupabase.from.mockReset()
  })

  it('waits for authLoading=false before fetching', async () => {
    mockAuth.loading = true
    mockSupabase.from.mockReturnValue({
      select: () => ({ order: () => ({ abortSignal: () => Promise.resolve({ data: [], error: null }) }) }),
    })

    render(
      <TripProvider>
        <TestConsumer />
      </TripProvider>
    )

    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('sets trips from response', async () => {
    const trips = [
      buildTrip({ id: 'trip-1', name: 'Summer', trip_code: 'summer-trip-Ab1234' }),
      buildTrip({ id: 'trip-2', name: 'Winter' }),
    ]

    mockSupabase.from.mockReturnValue({
      select: () => ({ order: () => ({ abortSignal: () => Promise.resolve({ data: trips, error: null }) }) }),
    })

    render(
      <TripProvider>
        <TestConsumer />
      </TripProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByTestId('trip1').textContent).toBe('Summer')
    expect(screen.getByTestId('tripByCode').textContent).toBe('Summer')
  })

  it('getTripById returns undefined when not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({ order: () => ({ abortSignal: () => Promise.resolve({ data: [], error: null }) }) }),
    })

    render(
      <TripProvider>
        <TestConsumer />
      </TripProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('trip1').textContent).toBe('null')
    expect(screen.getByTestId('tripByCode').textContent).toBe('null')
  })
})
