import { vi } from 'vitest'

interface MockResponse {
  data?: unknown
  error?: { message: string; code?: string } | null
}

/**
 * Creates a Proxy-based chainable mock for Supabase client.
 * Supports any chain depth (.from().select().eq().single() etc.)
 * and resolves with configurable { data, error }.
 */
export function createMockSupabase() {
  let _response: MockResponse = { data: null, error: null }

  function createChain(): any {
    const chain: any = new Proxy(() => {}, {
      get(_target, prop) {
        if (prop === 'then') {
          // Make the chain thenable (await support)
          return (resolve: (v: MockResponse) => void) => resolve(_response)
        }
        // Return chain for any property access
        return (..._args: unknown[]) => createChain()
      },
      apply() {
        return createChain()
      },
    })
    return chain
  }

  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signInWithIdToken: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }

  const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  }
  mockChannel.subscribe.mockReturnValue(mockChannel)

  const supabase = {
    from: vi.fn(() => createChain()),
    auth: mockAuth,
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    mockResponse(response: MockResponse) {
      _response = response
    },
    mockChannel,
  }

  return supabase
}
