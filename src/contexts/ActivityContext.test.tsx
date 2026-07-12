// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ActivityProvider, useActivityContext } from './ActivityContext'
import type { Activity } from '@/types/activity'

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

const activities: Activity[] = [
  {
    id: 'a1', trip_id: 'trip-1', activity_date: '2025-07-02',
    time_slot: 'evening', title: 'Evening Tour',
    created_at: '2025-07-01', updated_at: '2025-07-01',
  },
  {
    id: 'a2', trip_id: 'trip-1', activity_date: '2025-07-01',
    time_slot: 'afternoon', title: 'Afternoon Hike',
    created_at: '2025-07-01', updated_at: '2025-07-01',
  },
  {
    id: 'a3', trip_id: 'trip-1', activity_date: '2025-07-01',
    time_slot: 'morning', title: 'Morning Yoga',
    created_at: '2025-07-01', updated_at: '2025-07-01',
  },
]

function TestConsumer() {
  const { activities: acts, loading } = useActivityContext()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="order">{acts.map(a => a.title).join(',')}</span>
    </div>
  )
}

describe('ActivityContext', () => {
  beforeEach(() => {
    mockCurrentTrip.currentTrip = null
    mockCurrentTrip.tripCode = null
    mockSupabase.from.mockReset()
  })

  it('sorts activities by date then TIME_SLOT_ORDER', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ abortSignal: () => Promise.resolve({ data: activities, error: null }) }),
        }),
      }),
    })

    render(
      <ActivityProvider>
        <TestConsumer />
      </ActivityProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('order').textContent).toBe(
      'Morning Yoga,Afternoon Hike,Evening Tour'
    )
  })

  it('orders activities within a slot by start_time, untimed last (#789)', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    const sameSlot: Activity[] = [
      {
        id: 'b1', trip_id: 'trip-1', activity_date: '2025-07-01',
        time_slot: 'morning', title: 'No Time',
        created_at: '2025-07-01', updated_at: '2025-07-01',
      },
      {
        id: 'b2', trip_id: 'trip-1', activity_date: '2025-07-01',
        time_slot: 'morning', title: 'Later', start_time: '10:30:00',
        created_at: '2025-07-01', updated_at: '2025-07-01',
      },
      {
        id: 'b3', trip_id: 'trip-1', activity_date: '2025-07-01',
        time_slot: 'morning', title: 'Earlier', start_time: '08:15:00',
        created_at: '2025-07-01', updated_at: '2025-07-01',
      },
    ]

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ abortSignal: () => Promise.resolve({ data: sameSlot, error: null }) }),
        }),
      }),
    })

    render(
      <ActivityProvider>
        <TestConsumer />
      </ActivityProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('order').textContent).toBe('Earlier,Later,No Time')
  })
})
