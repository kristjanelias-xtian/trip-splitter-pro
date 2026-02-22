import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StayProvider, useStayContext } from './StayContext'
import type { Stay } from '@/types/stay'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

const mockCurrentTrip = vi.hoisted(() => ({
  currentTrip: null as any,
  tripCode: null as string | null,
  loading: false,
}))

vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => mockCurrentTrip,
}))

vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({ trips: [] }),
}))

const stay1: Stay = {
  id: 'stay-1', trip_id: 'trip-1', name: 'Hotel Alpha',
  check_in_date: '2025-07-01', check_out_date: '2025-07-05',
  created_at: '2025-06-01', updated_at: '2025-06-01',
}
const stay2: Stay = {
  id: 'stay-2', trip_id: 'trip-1', name: 'Hotel Beta',
  check_in_date: '2025-07-05', check_out_date: '2025-07-10',
  created_at: '2025-06-01', updated_at: '2025-06-01',
}

function TestConsumer() {
  const { stays, loading, getStayForDate, getStaysForDate } = useStayContext()
  const stayForJul3 = getStayForDate('2025-07-03')
  const stayForJul5 = getStayForDate('2025-07-05')
  const staysForJul5 = getStaysForDate('2025-07-05')
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{stays.length}</span>
      <span data-testid="stay-jul3">{stayForJul3?.name ?? 'null'}</span>
      <span data-testid="stay-jul5">{stayForJul5?.name ?? 'null'}</span>
      <span data-testid="stays-jul5-count">{staysForJul5.length}</span>
    </div>
  )
}

describe('StayContext', () => {
  beforeEach(() => {
    mockCurrentTrip.currentTrip = null
    mockCurrentTrip.tripCode = null
    mockSupabase.from.mockReset()
  })

  it('getStayForDate uses exclusive check-out (date < check_out)', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ abortSignal: () => Promise.resolve({ data: [stay1, stay2], error: null }) }),
        }),
      }),
    })

    render(
      <StayProvider>
        <TestConsumer />
      </StayProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByTestId('stay-jul3').textContent).toBe('Hotel Alpha')
    // Jul 5 is check-out of stay1 (exclusive), check-in of stay2
    expect(screen.getByTestId('stay-jul5').textContent).toBe('Hotel Beta')
  })

  it('getStaysForDate uses inclusive check-out (date <= check_out)', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ abortSignal: () => Promise.resolve({ data: [stay1, stay2], error: null }) }),
        }),
      }),
    })

    render(
      <StayProvider>
        <TestConsumer />
      </StayProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    // Jul 5 is both check_out of stay1 (inclusive) and check_in of stay2
    expect(screen.getByTestId('stays-jul5-count').textContent).toBe('2')
  })
})
