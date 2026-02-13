import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const FETCH_TIMEOUT_MS = 15_000

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    // Bypass navigator.locks entirely. The lock exists to prevent multiple
    // tabs from racing to refresh the same refresh token — but implicit flow
    // has no refresh tokens, so there's nothing to coordinate. Calling
    // navigator.locks.request() at all can hang indefinitely when another tab
    // holds the lock or the browser throttles background tabs.
    lock: async <R>(_name: string, _acquireTimeout: number, callback: () => Promise<R>): Promise<R> => {
      return callback()
    },
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      // Respect any existing signal from the caller
      if (init?.signal) {
        init.signal.addEventListener('abort', () => controller.abort())
      }

      return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
    },
  },
})
