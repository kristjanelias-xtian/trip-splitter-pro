import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTripContacts } from './useTripContacts'
import { buildEvent } from '@/test/factories'

// --- Mocks ---

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

const mockTrips = vi.hoisted(() => ({
  trips: [] as any[],
  loading: false,
  error: null,
  getTripById: vi.fn(),
  getTripByCode: vi.fn(),
  ensureTripLoaded: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  deleteTrip: vi.fn(),
  refreshTrips: vi.fn(),
}))
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => mockTrips,
}))

let mockQueryResult: { data: any[] | null; error: any } = { data: [], error: null }
let mockProfilesResult: { data: any[] | null; error: any } = { data: [], error: null }

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

function setupQueryChain() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: () => ({
          in: () => ({
            abortSignal: () => Promise.resolve(mockProfilesResult),
          }),
        }),
      }
    }
    // participants
    return {
      select: () => ({
        in: () => ({
          limit: () => ({
            abortSignal: () => Promise.resolve(mockQueryResult),
          }),
        }),
      }),
    }
  })
}

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// --- Tests ---

describe('useTripContacts', () => {
  beforeEach(() => {
    mockAuth.user = null
    mockTrips.trips = []
    mockQueryResult = { data: [], error: null }
    mockProfilesResult = { data: [], error: null }
    mockSupabase.from.mockReset()
    setupQueryChain()
  })

  it('returns empty array when user is not authenticated', () => {
    mockAuth.user = null
    const { result } = renderHook(() => useTripContacts('trip-current'))
    expect(result.current.contacts).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns empty array when user has only the current trip', () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [buildEvent({ id: 'trip-current' })]

    const { result } = renderHook(() => useTripContacts('trip-current'))
    expect(result.current.contacts).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns empty array when currentTripId is undefined', () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [buildEvent({ id: 'trip-1' })]

    const { result } = renderHook(() => useTripContacts(undefined))
    expect(result.current.contacts).toEqual([])
  })

  it('fetches and returns contacts from other trips', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current', end_date: '2025-08-01' }),
      buildEvent({ id: 'trip-old', end_date: '2025-06-01' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Alice', email: 'alice@test.com', user_id: null, trip_id: 'trip-old' },
        { name: 'Bob', email: 'bob@test.com', user_id: 'user-bob', trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = await renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(2)
    })

    expect(result.current.contacts[0].name).toBe('Alice')
    expect(result.current.contacts[0].email).toBe('alice@test.com')
    expect(result.current.contacts[0].display_name).toBeNull()
    expect(result.current.contacts[1].name).toBe('Bob')
    expect(result.current.contacts[1].user_id).toBe('user-bob')
    expect(result.current.contacts[1].display_name).toBeNull()
  })

  it('excludes current user from results', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Me', email: 'me@test.com', user_id: 'user-1', trip_id: 'trip-old' },
        { name: 'Alice', email: 'alice@test.com', user_id: null, trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].name).toBe('Alice')
  })

  it('deduplicates by email across trips, keeps most recent', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2025-01-01' }),
      buildEvent({ id: 'trip-recent', end_date: '2025-09-01' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Marta', email: 'marta@test.com', user_id: null, trip_id: 'trip-old' },
        { name: 'Marta Tamm', email: 'marta@test.com', user_id: 'user-marta', trip_id: 'trip-recent' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    // Keeps the more recent record (trip-recent has later end_date)
    expect(result.current.contacts[0].name).toBe('Marta Tamm')
    expect(result.current.contacts[0].user_id).toBe('user-marta')
    expect(result.current.contacts[0].lastSeenAt).toBe('2025-09-01')
  })

  it('deduplicates by name when no email exists', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-a', end_date: '2025-03-01' }),
      buildEvent({ id: 'trip-b', end_date: '2025-06-01' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Carlos', email: null, user_id: null, trip_id: 'trip-a' },
        { name: 'Carlos', email: null, user_id: null, trip_id: 'trip-b' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].name).toBe('Carlos')
    expect(result.current.contacts[0].lastSeenAt).toBe('2025-06-01')
  })

  it('includes participants with no email', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'No Email Person', email: null, user_id: null, trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].email).toBeNull()
    expect(result.current.contacts[0].name).toBe('No Email Person')
  })

  it('preserves user_id from participant data', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Linked User', email: 'linked@test.com', user_id: 'user-linked', trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].user_id).toBe('user-linked')
  })

  it('uses trip end_date as lastSeenAt', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2025-12-25' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Santa', email: 'santa@north.pole', user_id: null, trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].lastSeenAt).toBe('2025-12-25')
  })

  it('sorts contacts by lastSeenAt descending', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2024-01-01' }),
      buildEvent({ id: 'trip-recent', end_date: '2025-12-01' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Old Friend', email: 'old@test.com', user_id: null, trip_id: 'trip-old' },
        { name: 'Recent Friend', email: 'recent@test.com', user_id: null, trip_id: 'trip-recent' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(2)
    })

    expect(result.current.contacts[0].name).toBe('Recent Friend')
    expect(result.current.contacts[1].name).toBe('Old Friend')
  })

  it('populates display_name from user_profiles for linked users', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Kairi', email: 'kairi@test.com', user_id: 'user-kairi', trip_id: 'trip-old' },
      ],
      error: null,
    }
    mockProfilesResult = {
      data: [
        { id: 'user-kairi', display_name: 'Kairi Tamm' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].name).toBe('Kairi')
    expect(result.current.contacts[0].display_name).toBe('Kairi Tamm')
    expect(result.current.contacts[0].user_id).toBe('user-kairi')
  })

  it('returns display_name null for contacts without user_id', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'No Account', email: 'noaccount@test.com', user_id: null, trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].display_name).toBeNull()
  })

  it('deduplicates by user_id across trips and preserves email from the record that has it', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2025-01-01' }),
      buildEvent({ id: 'trip-recent', end_date: '2025-09-01' }),
    ]
    mockQueryResult = {
      data: [
        // Older trip has email
        { name: 'Kairi', email: 'kairi@test.com', user_id: 'user-kairi', trip_id: 'trip-old' },
        // Newer trip has no email (participant record without email)
        { name: 'Kairi T', email: null, user_id: 'user-kairi', trip_id: 'trip-recent' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    // Should keep email from the older record (best email preserved)
    expect(result.current.contacts[0].email).toBe('kairi@test.com')
    // Name from newer record
    expect(result.current.contacts[0].name).toBe('Kairi T')
    expect(result.current.contacts[0].lastSeenAt).toBe('2025-09-01')
  })

  it('deduplicates by user_id when only older record has email', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-a', end_date: '2025-03-01' }),
      buildEvent({ id: 'trip-b', end_date: '2025-06-01' }),
    ]
    mockQueryResult = {
      data: [
        // Older record has email
        { name: 'Bob', email: 'bob@test.com', user_id: 'user-bob', trip_id: 'trip-a' },
        // Newer record does not
        { name: 'Bob', email: null, user_id: 'user-bob', trip_id: 'trip-b' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    expect(result.current.contacts[0].email).toBe('bob@test.com')
    expect(result.current.contacts[0].lastSeenAt).toBe('2025-06-01')
  })

  it('does NOT dedup contacts with same name but different user_ids', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2025-06-01' }),
    ]
    mockQueryResult = {
      data: [
        { name: 'Alex', email: null, user_id: 'user-alex-1', trip_id: 'trip-old' },
        { name: 'Alex', email: null, user_id: 'user-alex-2', trip_id: 'trip-old' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(2)
    })

    // Both should be present — different user_ids means different people
    const userIds = result.current.contacts.map(c => c.user_id)
    expect(userIds).toContain('user-alex-1')
    expect(userIds).toContain('user-alex-2')
  })

  it('prefers record with display_name when deduplicating by email', async () => {
    mockAuth.user = { id: 'user-1' }
    mockTrips.trips = [
      buildEvent({ id: 'trip-current' }),
      buildEvent({ id: 'trip-old', end_date: '2025-01-01' }),
      buildEvent({ id: 'trip-recent', end_date: '2025-09-01' }),
    ]
    mockQueryResult = {
      data: [
        // More recent trip but no user_id (no display_name)
        { name: 'Marta', email: 'marta@test.com', user_id: null, trip_id: 'trip-recent' },
        // Older trip but has user_id with display_name
        { name: 'Marta', email: 'marta@test.com', user_id: 'user-marta', trip_id: 'trip-old' },
      ],
      error: null,
    }
    mockProfilesResult = {
      data: [
        { id: 'user-marta', display_name: 'Marta Tamm' },
      ],
      error: null,
    }

    const { result } = renderHook(() => useTripContacts('trip-current'))

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1)
    })

    // Should prefer the record with display_name even though the other is more recent
    expect(result.current.contacts[0].display_name).toBe('Marta Tamm')
    expect(result.current.contacts[0].user_id).toBe('user-marta')
    // lastSeenAt should still be the most recent date
    expect(result.current.contacts[0].lastSeenAt).toBe('2025-09-01')
  })
})
