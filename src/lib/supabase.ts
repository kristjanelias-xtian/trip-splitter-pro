import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const LOCK_TIMEOUT_MS = 10_000
const FETCH_TIMEOUT_MS = 15_000

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    lock: async <R>(name: string, acquireTimeout: number, callback: () => Promise<R>): Promise<R> => {
      if (typeof navigator === 'undefined' || !navigator.locks) {
        // Fallback: no Web Locks API (SSR, older browsers)
        return callback()
      }

      const ac = new AbortController()
      const timeout = acquireTimeout === -1 ? LOCK_TIMEOUT_MS : Math.min(acquireTimeout, LOCK_TIMEOUT_MS)
      const timer = setTimeout(() => ac.abort(), timeout)

      try {
        return await navigator.locks.request(name, { signal: ac.signal }, async () => {
          clearTimeout(timer)
          return callback()
        })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Lock acquisition timed out — proceed without the lock.
          // Safe for implicit flow (no refresh tokens to coordinate across tabs).
          return callback()
        }
        throw err
      }
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
