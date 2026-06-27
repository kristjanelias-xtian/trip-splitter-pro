import { Page } from '@playwright/test'
import {
  SUPABASE_URL,
  getProjectRef,
  mockUser,
  mockSession,
  mockUserProfile,
  mockTrip,
  mockParticipant,
  mockParticipant2,
  mockExpense,
  mockSettlement,
  mockUserPreferences,
  mockQuickUserPreferences,
  mockWallet,
  mockWalletMember,
  mockWalletPet,
  mockWalletTransactions,
} from './mock-data'

type Mode = 'full' | 'quick'

/**
 * Captures the most recent POST body sent to each PostgREST RPC (keyed by RPC
 * name). The broad Supabase route below records into this object and fulfills
 * the call with `null`, so tests can assert on the payload without registering
 * their own competing route (route precedence differs across chromium/webkit).
 */
export type RpcCapture = Record<string, unknown>

/**
 * Intercept all Supabase HTTP requests and return mock data.
 * Call this BEFORE navigating to any page.
 *
 * @param rpcCapture optional object the interceptor writes RPC bodies into,
 *   keyed by RPC name (e.g. `rpcCapture['reassign_participant']`).
 */
export async function setupSupabaseInterceptor(page: Page, mode: Mode = 'full', rpcCapture?: RpcCapture) {
  const prefs = mode === 'quick' ? mockQuickUserPreferences : mockUserPreferences
  const projectRef = getProjectRef()

  // Seed localStorage before the page loads so:
  //  - Supabase auth.getSession() finds a cached session (no network call)
  //  - UserPreferencesContext reads the correct mode
  await page.addInitScript(
    ({ storageKey, session, preferences }) => {
      localStorage.setItem(storageKey, JSON.stringify(session))
      localStorage.setItem('spl1t:user-preferences', JSON.stringify(preferences))
      // Also set old key — UserPreferencesContext checks it for initial loading state
      localStorage.setItem('trip-splitter:user-preferences', JSON.stringify(preferences))
    },
    {
      storageKey: `sb-${projectRef}-auth-token`,
      session: mockSession,
      preferences: prefs,
    }
  )

  // Intercept all requests to the Supabase origin (or any *.supabase.co as fallback)
  const pattern = SUPABASE_URL
    ? `${SUPABASE_URL}/**`
    : '**/supabase.co/**'

  await page.route(pattern, (route) => {
    const url = route.request().url()
    const method = route.request().method()

    // RPC calls (/rest/v1/rpc/*) are handled by a dedicated RegExp route
    // registered below - see the note there.

    // --- Auth endpoints ---
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSession) })
    }
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) })
    }
    if (url.includes('/auth/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    }

    // --- Realtime WebSocket — abort so shopping list falls back to initial fetch ---
    if (url.includes('/realtime/')) {
      return route.abort()
    }

    // --- Edge Functions ---
    if (url.includes('/functions/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    }

    // --- Storage ---
    if (url.includes('/storage/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    }

    // --- PostgREST (rest/v1/{table}) ---
    if (url.includes('/rest/v1/')) {
      return handlePostgREST(route, url, method)
    }

    // Fallback — unknown Supabase endpoint
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  // Dedicated RPC route, registered after (so it wins) and matched by RegExp.
  // The broad `${url}/**` glob does not reliably intercept the RPC POST on
  // webkit; a RegExp on the path matches consistently across browsers.
  await page.route(/\/rest\/v1\/rpc\//, (route) => {
    const url = route.request().url()
    const rpcName = url.split('/rest/v1/rpc/')[1]?.split('?')[0] ?? ''
    if (rpcCapture) {
      try {
        rpcCapture[rpcName] = route.request().postDataJSON()
      } catch {
        rpcCapture[rpcName] = route.request().postData() ?? null
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })
}

function handlePostgREST(
  route: Parameters<Parameters<Page['route']>[1]>[0],
  url: string,
  method: string,
) {
  // Extract table name from /rest/v1/{table}?...
  const pathAfterRest = url.split('/rest/v1/')[1]
  const table = pathAfterRest?.split('?')[0] || ''

  // Writes (POST/PATCH/DELETE) — return appropriate mock
  if (method !== 'GET') {
    if (table === 'user_profiles') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserProfile),
      })
    }
    if (table === 'user_preferences') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserPreferences),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  }

  // GET requests — return mock arrays per table
  switch (table) {
    case 'trips':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockTrip]),
      })

    case 'participants':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockParticipant, mockParticipant2]),
      })

    case 'families':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'expenses':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockExpense]),
      })

    case 'settlements':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockSettlement]),
      })

    case 'meals':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'meal_shopping_items':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'shopping_items':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'activities':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'stays':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'user_profiles':
      // .in() queries (e.g. bank details fetch) → return array
      if (url.includes('in.')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockUserProfile]),
        })
      }
      // .maybeSingle()/.single() requests → return single object
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserProfile),
      })

    case 'user_preferences':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockUserPreferences]),
      })

    case 'receipt_tasks':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    case 'invitations':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    // --- Kopikas tables ---
    case 'wallets':
      // .single() query (by wallet_code) → single object
      if (url.includes('wallet_code')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockWallet),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockWallet]),
      })

    case 'wallet_members':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockWalletMember]),
      })

    case 'wallet_transactions':
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWalletTransactions),
      })

    case 'wallet_pets':
      // .single() query → single object
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWalletPet),
      })

    case 'wallet_category_corrections':
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

    default:
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  }
}
