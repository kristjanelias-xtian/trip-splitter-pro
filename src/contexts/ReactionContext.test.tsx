// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ReactionProvider, useReactionContext } from './ReactionContext'

const mockCurrentTrip = vi.hoisted(() => ({
  currentTrip: null as { id: string } | null,
}))

const mockSupabase = vi.hoisted(() => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
  }
  return {
    from: vi.fn(() => chainable),
    chainable,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }
})

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => mockCurrentTrip,
}))
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({ trips: [], loading: false }),
  TripProvider: ({ children }: { children: React.ReactNode }) => children,
}))

function TestConsumer() {
  const { reactions, loading } = useReactionContext()
  const count = reactions.size
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{count}</span>
    </div>
  )
}

describe('ReactionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTrip.currentTrip = null
  })

  it('does not fetch when no trip is loaded', () => {
    render(
      <ReactionProvider>
        <TestConsumer />
      </ReactionProvider>
    )
    expect(mockSupabase.from).not.toHaveBeenCalled()
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('fetches reactions when trip is loaded', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockSupabase.chainable.eq.mockResolvedValueOnce({
      data: [
        { id: 'r1', expense_id: 'e1', participant_id: 'p1', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r2', expense_id: 'e1', participant_id: 'p2', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r3', expense_id: 'e1', participant_id: 'p1', emoji: '😂', created_at: '2026-01-01' },
      ],
      error: null,
    })

    render(
      <ReactionProvider>
        <TestConsumer />
      </ReactionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })
  })

  it('groups reactions by expense and emoji', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockSupabase.chainable.eq.mockResolvedValueOnce({
      data: [
        { id: 'r1', expense_id: 'e1', participant_id: 'p1', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r2', expense_id: 'e1', participant_id: 'p2', emoji: '🔥', created_at: '2026-01-01' },
      ],
      error: null,
    })

    function DetailConsumer() {
      const { reactions } = useReactionContext()
      const e1 = reactions.get('e1')
      const fireCount = e1?.['🔥']?.count ?? 0
      const fireParticipants = e1?.['🔥']?.participantIds?.length ?? 0
      return (
        <div>
          <span data-testid="fire-count">{fireCount}</span>
          <span data-testid="fire-participants">{fireParticipants}</span>
        </div>
      )
    }

    render(
      <ReactionProvider>
        <DetailConsumer />
      </ReactionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('fire-count')).toHaveTextContent('2')
      expect(screen.getByTestId('fire-participants')).toHaveTextContent('2')
    })
  })
})
