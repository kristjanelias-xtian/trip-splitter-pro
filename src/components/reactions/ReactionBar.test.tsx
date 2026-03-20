// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactionBar } from './ReactionBar'

const mockReactionContext = vi.hoisted(() => ({
  reactions: new Map(),
  loading: false,
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}))

const mockMyParticipant = vi.hoisted(() => ({
  value: null as { id: string } | null,
}))

vi.mock('@/contexts/ReactionContext', () => ({
  useReactionContext: () => mockReactionContext,
}))

vi.mock('@/hooks/useMyParticipant', () => ({
  useMyParticipant: () => ({ myParticipant: mockMyParticipant.value, isLinked: !!mockMyParticipant.value, loading: false }),
}))

vi.mock('@/contexts/ParticipantContext', () => ({
  useParticipantContext: () => ({ participants: [] }),
}))

describe('ReactionBar', () => {
  it('renders nothing when not logged in and no reactions', () => {
    mockMyParticipant.value = null
    mockReactionContext.reactions = new Map()

    const { container } = render(<ReactionBar expenseId="e1" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows read-only pills when not logged in but reactions exist', () => {
    mockMyParticipant.value = null
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 2, participantIds: ['p1', 'p2'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.getByText(/🔥 2/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Add reaction')).not.toBeInTheDocument()
  })

  it('shows pills with + button when logged in', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 1, participantIds: ['p2'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.getByText(/🔥 1/)).toBeInTheDocument()
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument()
  })

  it('highlights pills for own reactions', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 1, participantIds: ['p1'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    const pill = screen.getByText(/🔥 1/)
    expect(pill.className).toContain('bg-primary/15')
  })

  it('hides + button when all 6 emoji are used', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', {
        '👍': { count: 1, participantIds: ['p1'] },
        '👎': { count: 1, participantIds: ['p1'] },
        '😂': { count: 1, participantIds: ['p1'] },
        '🔥': { count: 1, participantIds: ['p1'] },
        '😱': { count: 1, participantIds: ['p1'] },
        '💸': { count: 1, participantIds: ['p1'] },
      }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.queryByLabelText('Add reaction')).not.toBeInTheDocument()
  })
})
