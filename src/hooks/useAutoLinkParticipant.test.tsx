// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoLinkParticipant } from './useAutoLinkParticipant'
import { buildParticipant } from '@/test/factories'

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

const mockAuth: any = {
  user: null,
  userProfile: null,
}
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockParticipantCtx: any = {
  participants: [],
  loading: false,
  linkUserToParticipant: vi.fn(),
}
vi.mock('@/contexts/ParticipantContext', () => ({
  useParticipantContext: () => mockParticipantCtx,
}))

const mockCurrentTrip: any = {
  currentTrip: null,
}
vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => mockCurrentTrip,
}))

beforeEach(() => {
  mockAuth.user = null
  mockAuth.userProfile = null
  mockCurrentTrip.currentTrip = null
  mockParticipantCtx.participants = []
  mockParticipantCtx.loading = false
  mockParticipantCtx.linkUserToParticipant = vi.fn().mockResolvedValue(true)
  mockToast.mockClear()
})

describe('useAutoLinkParticipant', () => {
  it('returns autoLinked=false when user is not authenticated', () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', email: 'alice@example.com' }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    expect(result.current.autoLinked).toBe(false)
    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
  })

  it('returns autoLinked=false when participants are loading', () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.loading = true

    const { result } = renderHook(() => useAutoLinkParticipant())
    expect(result.current.autoLinked).toBe(false)
  })

  it('auto-links when exactly one email match', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockAuth.userProfile = { display_name: 'Alice Smith' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice', email: 'alice@example.com', is_adult: true }),
      buildParticipant({ id: 'p2', name: 'Bob', email: 'bob@example.com', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())

    // Wait for async linkUserToParticipant to resolve
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).toHaveBeenCalledWith(
      'p1', 'u1', 'alice@example.com', 'Alice Smith'
    )
    expect(result.current.autoLinked).toBe(true)
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "You've been linked!" })
    )
  })

  it('does not link when email matches are ambiguous (2+)', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice A', email: 'alice@example.com', is_adult: true }),
      buildParticipant({ id: 'p2', name: 'Alice B', email: 'alice@example.com', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(false)
  })

  it('does not link when no email matches', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Bob', email: 'bob@example.com', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(false)
  })

  it('skips participants already linked to another user', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice', email: 'alice@example.com', user_id: 'other-user', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(false)
  })

  it('skips child participants', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice Jr', email: 'alice@example.com', is_adult: false }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(false)
  })

  it('does not link when user is already linked in trip', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice', email: 'alice@example.com', user_id: 'u1', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).not.toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(false)
  })

  it('handles case-insensitive email matching', async () => {
    mockAuth.user = { id: 'u1', email: 'Alice@Example.COM' }
    mockAuth.userProfile = { display_name: 'Alice' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice', email: 'alice@example.com', is_adult: true }),
    ]

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(mockParticipantCtx.linkUserToParticipant).toHaveBeenCalled()
    expect(result.current.autoLinked).toBe(true)
  })

  it('stays autoLinked=false when linkUserToParticipant fails', async () => {
    mockAuth.user = { id: 'u1', email: 'alice@example.com' }
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockParticipantCtx.participants = [
      buildParticipant({ id: 'p1', name: 'Alice', email: 'alice@example.com', is_adult: true }),
    ]
    mockParticipantCtx.linkUserToParticipant = vi.fn().mockResolvedValue(false)

    const { result } = renderHook(() => useAutoLinkParticipant())
    await act(async () => {})

    expect(result.current.autoLinked).toBe(false)
    expect(mockToast).not.toHaveBeenCalled()
  })
})
