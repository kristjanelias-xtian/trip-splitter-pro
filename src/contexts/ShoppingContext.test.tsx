import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { ShoppingProvider, useShoppingContext } from './ShoppingContext'
import type { ShoppingItem } from '@/types/shopping'

const mockChannelInstance = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}))

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  channel: vi.fn(() => mockChannelInstance),
  removeChannel: vi.fn(),
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

const sampleItems: ShoppingItem[] = [
  {
    id: 's1', trip_id: 'trip-1', name: 'Apples', category: 'produce',
    is_completed: false, created_at: '2025-07-01', updated_at: '2025-07-01',
  },
  {
    id: 's2', trip_id: 'trip-1', name: 'Milk', category: 'dairy',
    is_completed: false, created_at: '2025-07-01', updated_at: '2025-07-01',
  },
]

function TestConsumer() {
  const { shoppingItems, loading, toggleItemCompleted } = useShoppingContext()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{shoppingItems.length}</span>
      <span data-testid="items">{JSON.stringify(shoppingItems.map(i => ({ id: i.id, done: i.is_completed })))}</span>
      <button data-testid="toggle-s1" onClick={() => toggleItemCompleted('s1')}>Toggle</button>
    </div>
  )
}

/** Build the select→eq→order→order→abortSignal chain for shopping item fetches */
function mockSelectChain(data: ShoppingItem[]) {
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          order: () => ({ abortSignal: () => Promise.resolve({ data, error: null }) }),
        }),
      }),
    }),
  }
}

describe('ShoppingContext', () => {
  beforeEach(() => {
    mockCurrentTrip.currentTrip = null
    mockCurrentTrip.tripCode = null
    mockSupabase.from.mockReset()
    mockSupabase.channel.mockReset()
    mockSupabase.removeChannel.mockReset()
    mockChannelInstance.on.mockReturnThis()
    mockChannelInstance.subscribe.mockReturnThis()
    mockSupabase.channel.mockReturnValue(mockChannelInstance)
  })

  it('clears items and sets loading=false when no currentTrip', async () => {
    render(
      <ShoppingProvider>
        <TestConsumer />
      </ShoppingProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('count').textContent).toBe('0')
    })
  })

  it('fetches items and sets up real-time channel', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue(mockSelectChain(sampleItems))

    render(
      <ShoppingProvider>
        <TestConsumer />
      </ShoppingProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('count').textContent).toBe('2')
    })

    expect(mockSupabase.channel).toHaveBeenCalled()
  })

  it('toggleItemCompleted performs optimistic update', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue({
      ...mockSelectChain([...sampleItems]),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { ...sampleItems[0], is_completed: true },
              error: null,
            }),
          }),
        }),
      }),
    })

    render(
      <ShoppingProvider>
        <TestConsumer />
      </ShoppingProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2')
    })

    mockSupabase.from.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { ...sampleItems[0], is_completed: true },
              error: null,
            }),
          }),
        }),
      }),
    })

    await act(async () => {
      screen.getByTestId('toggle-s1').click()
    })

    await waitFor(() => {
      const items = JSON.parse(screen.getByTestId('items').textContent!)
      const s1 = items.find((i: any) => i.id === 's1')
      expect(s1.done).toBe(true)
    })
  })

  it('cleans up channel on unmount', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue(mockSelectChain([]))

    const { unmount } = render(
      <ShoppingProvider>
        <TestConsumer />
      </ShoppingProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
})
