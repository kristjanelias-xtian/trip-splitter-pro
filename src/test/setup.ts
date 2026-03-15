// SPDX-License-Identifier: Apache-2.0
import '@testing-library/jest-dom'

// Mock react-i18next for all tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
          key
        )
      }
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Stub Supabase env vars so the real module doesn't throw on import
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('VITE_ADMIN_PASSWORD', 'test-admin-pw')

// Provide a proper Storage mock (Node 22+ has a built-in localStorage
// that can conflict with jsdom's implementation)
function createStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

const localStorageMock = createStorage()
const sessionStorageMock = createStorage()

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Stub matchMedia (used by useTheme module-level code)
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
  localStorageMock.clear()
  sessionStorageMock.clear()
})
