import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const FETCH_TIMEOUT_MS = 30_000
const UPLOAD_TIMEOUT_MS = 60_000

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
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
      const isLongRunning = url.includes('/storage/') || url.includes('/functions/')
      const timeout = isLongRunning ? UPLOAD_TIMEOUT_MS : FETCH_TIMEOUT_MS

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      // Respect any existing signal from the caller
      if (init?.signal) {
        init.signal.addEventListener('abort', () => controller.abort())
      }

      return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
    },
  },
})
