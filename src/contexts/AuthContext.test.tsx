import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Use vi.hoisted so the mock is available when vi.mock factory runs
const mockSupabase = vi.hoisted(() => {
  const fn = vi.fn
  return {
    from: fn().mockReturnValue(new Proxy(() => {}, {
      get: () => () => new Proxy(() => {}, { get: () => () => Promise.resolve({ data: null, error: null }) }),
      apply: () => Promise.resolve({ data: null, error: null }),
    })),
    auth: {
      getSession: fn().mockResolvedValue({ data: { session: null } }),
      getUser: fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: fn().mockReturnValue({
        data: { subscription: { unsubscribe: fn() } },
      }),
      signInWithIdToken: fn().mockResolvedValue({ error: null }),
      signOut: fn().mockResolvedValue({ error: null }),
    },
    functions: { invoke: fn().mockResolvedValue({ data: null, error: null }) },
    channel: fn(),
    removeChannel: fn(),
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

function TestConsumer() {
  const { user, userProfile, session, loading } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? 'null'}</span>
      <span data-testid="profile">{userProfile?.display_name ?? 'null'}</span>
      <span data-testid="session">{session ? 'active' : 'null'}</span>
    </div>
  )
}

describe('AuthContext', () => {
  let authChangeCallback: ((event: string, session: any) => void) | null = null

  beforeEach(() => {
    authChangeCallback = null
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.onAuthStateChange.mockReset()
    mockSupabase.auth.signOut.mockReset()
    mockSupabase.from.mockReset()

    // Default: no session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      authChangeCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
  })

  it('starts loading=true and resolves to loading=false after getSession', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('skips INITIAL_SESSION event to prevent double fetch', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      authChangeCallback?.('INITIAL_SESSION', null)
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('handles SIGNED_IN event by setting user', async () => {
    mockSupabase.from.mockReturnValue({
      upsert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'user-1',
                display_name: 'Alice',
                email: 'alice@test.com',
                avatar_url: null,
                bank_account_holder: null,
                bank_iban: null,
                created_at: '2025-01-01',
                updated_at: '2025-01-01',
              },
              error: null,
            }),
        }),
      }),
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    const mockUser = {
      id: 'user-1',
      email: 'alice@test.com',
      user_metadata: { full_name: 'Alice', avatar_url: null },
    }

    await act(async () => {
      authChangeCallback?.('SIGNED_IN', {
        user: mockUser,
        access_token: 'token',
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user-1')
    })
  })

  it('clears user/session/profile on sign out', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'alice@test.com',
      user_metadata: { full_name: 'Alice' },
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: { user: mockUser, access_token: 'token' },
      },
    })

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: 'user-1',
                display_name: 'Alice',
                email: 'alice@test.com',
                avatar_url: null,
                bank_account_holder: null,
                bank_iban: null,
                created_at: '2025-01-01',
                updated_at: '2025-01-01',
              },
              error: null,
            }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user-1')
    })

    await act(async () => {
      authChangeCallback?.('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('profile').textContent).toBe('null')
      expect(screen.getByTestId('session').textContent).toBe('null')
    })
  })

  it('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    })

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
