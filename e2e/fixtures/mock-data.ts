/**
 * Mock data for Playwright E2E smoke tests.
 *
 * The real Supabase URL is read from .env.local at runtime (via dotenv)
 * so the route interceptor matches the same origin the Vite app uses.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local the same way Vite does
config({ path: resolve(process.cwd(), '.env.local') })

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Derive the Supabase project ref (subdomain) for auth localStorage key */
export function getProjectRef(): string {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0]
  } catch {
    return 'mock'
  }
}

// ─── IDs ────────────────────────────────────────────────────────────────
export const MOCK_USER_ID = 'e2e-user-0001-0001-0001-000000000001'
export const MOCK_TRIP_ID = 'e2e-trip-0001-0001-0001-000000000001'
export const MOCK_TRIP_CODE = 'test-trip-abc123'
export const MOCK_PARTICIPANT_ID = 'e2e-part-0001-0001-0001-000000000001'
export const MOCK_PARTICIPANT_2_ID = 'e2e-part-0002-0002-0002-000000000002'
export const MOCK_EXPENSE_ID = 'e2e-exp-0001-0001-0001-000000000001'

// ─── Mock objects ───────────────────────────────────────────────────────

export const mockUser = {
  id: MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2025-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2025-01-01T00:00:00.000Z',
  last_sign_in_at: '2025-01-01T00:00:00.000Z',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {
    full_name: 'Test User',
    name: 'Test User',
    avatar_url: '',
    picture: '',
    email: 'test@example.com',
  },
  identities: [],
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
}

export const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
}

export const mockUserProfile = {
  id: MOCK_USER_ID,
  display_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  bank_account_holder: null,
  bank_iban: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
}

export const mockTrip = {
  id: MOCK_TRIP_ID,
  trip_code: MOCK_TRIP_CODE,
  name: 'Test Trip',
  start_date: '2025-06-01',
  end_date: '2025-06-07',
  event_type: 'trip',
  tracking_mode: 'individuals',
  default_currency: 'EUR',
  exchange_rates: {},
  enable_meals: true,
  enable_activities: true,
  enable_shopping: true,
  default_split_all: true,
  created_by: MOCK_USER_ID,
  created_at: '2025-01-01T00:00:00.000Z',
}

export const mockParticipant = {
  id: MOCK_PARTICIPANT_ID,
  trip_id: MOCK_TRIP_ID,
  family_id: null,
  name: 'Test User',
  is_adult: true,
  user_id: MOCK_USER_ID,
  email: 'test@example.com',
}

export const mockParticipant2 = {
  id: MOCK_PARTICIPANT_2_ID,
  trip_id: MOCK_TRIP_ID,
  family_id: null,
  name: 'Other Person',
  is_adult: true,
  user_id: null,
  email: 'other@example.com',
}

export const mockExpense = {
  id: MOCK_EXPENSE_ID,
  trip_id: MOCK_TRIP_ID,
  description: 'Test Dinner',
  amount: 50.0,
  currency: 'EUR',
  paid_by: MOCK_PARTICIPANT_ID,
  distribution: {
    type: 'individuals',
    participants: [MOCK_PARTICIPANT_ID, MOCK_PARTICIPANT_2_ID],
  },
  category: 'Food',
  expense_date: '2025-06-02',
  comment: null,
  meal_id: null,
  created_at: '2025-06-02T12:00:00.000Z',
  updated_at: '2025-06-02T12:00:00.000Z',
}

export const mockUserPreferences = {
  id: MOCK_USER_ID,
  preferred_mode: 'full' as const,
  default_trip_id: MOCK_TRIP_ID,
}

export const mockQuickUserPreferences = {
  id: MOCK_USER_ID,
  preferred_mode: 'quick' as const,
  default_trip_id: MOCK_TRIP_ID,
}
