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
  mockUserPreferences,
  mockQuickUserPreferences,
} from './mock-data'

type Mode = 'full' | 'quick'

/**
 * Intercept all Supabase HTTP requests and return mock data.
 * Call this BEFORE navigating to any page.
 */
export async function setupSupabaseInterceptor(page: Page, mode: Mode = 'full') {
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
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })

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

    default:
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  }
}
