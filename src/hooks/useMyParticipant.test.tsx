import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMyParticipant } from './useMyParticipant'
import { buildParticipant } from '@/test/factories'

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

// Mock ParticipantContext
const mockParticipants = {
  participants: [
    buildParticipant({ id: 'p1', name: 'Alice', user_id: 'user-1' }),
    buildParticipant({ id: 'p2', name: 'Bob', user_id: 'user-2' }),
  ],
  loading: false,
}
vi.mock('@/contexts/ParticipantContext', () => ({
  useParticipantContext: () => mockParticipants,
}))

describe('useMyParticipant', () => {
  it('returns null when unauthenticated', () => {
    mockAuth.user = null
    const { result } = renderHook(() => useMyParticipant())
    expect(result.current.myParticipant).toBeNull()
    expect(result.current.isLinked).toBe(false)
  })

  it('finds participant matching user.id', () => {
    mockAuth.user = { id: 'user-1' }
    const { result } = renderHook(() => useMyParticipant())
    expect(result.current.myParticipant?.name).toBe('Alice')
    expect(result.current.isLinked).toBe(true)
  })

  it('returns null when user has no matching participant', () => {
    mockAuth.user = { id: 'user-99' }
    const { result } = renderHook(() => useMyParticipant())
    expect(result.current.myParticipant).toBeNull()
    expect(result.current.isLinked).toBe(false)
  })
})
