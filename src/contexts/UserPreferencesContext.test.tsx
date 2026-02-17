import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { UserPreferencesProvider, useUserPreferences } from './UserPreferencesContext'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

const mockAuth = vi.hoisted(() => ({
  user: null as any,
  userProfile: null as any,
  session: null,
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateBankDetails: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

function TestConsumer() {
  const { mode, loading, setMode } = useUserPreferences()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button data-testid="set-full" onClick={() => setMode('full')}>Set Full</button>
    </div>
  )
}

describe('UserPreferencesContext', () => {
  beforeEach(() => {
    mockAuth.user = null
    mockAuth.loading = false
    mockSupabase.from.mockReset()
  })

  it('sets loading=false when no user (local prefs authoritative)', async () => {
    render(
      <UserPreferencesProvider>
        <TestConsumer />
      </UserPreferencesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
  })

  it('fetches from Supabase when user exists and server overrides local', async () => {
    mockAuth.user = { id: 'user-1' }

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: { preferred_mode: 'full', default_trip_id: null },
              error: null,
            }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    })

    render(
      <UserPreferencesProvider>
        <TestConsumer />
      </UserPreferencesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('mode').textContent).toBe('full')
    })
  })

  it('does not double-fetch (hasInitialized ref)', async () => {
    mockAuth.user = { id: 'user-1' }

    let fetchCount = 0
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => {
            fetchCount++
            return Promise.resolve({
              data: { preferred_mode: 'quick', default_trip_id: null },
              error: null,
            })
          },
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    })

    const { rerender } = render(
      <UserPreferencesProvider>
        <TestConsumer />
      </UserPreferencesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    rerender(
      <UserPreferencesProvider>
        <TestConsumer />
      </UserPreferencesProvider>
    )

    expect(fetchCount).toBe(1)
  })

  it('setMode updates local state', async () => {
    mockAuth.user = null

    render(
      <UserPreferencesProvider>
        <TestConsumer />
      </UserPreferencesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByTestId('set-full').click()
    })

    expect(screen.getByTestId('mode').textContent).toBe('full')
  })
})
