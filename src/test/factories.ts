// SPDX-License-Identifier: Apache-2.0
import type { Participant } from '@/types/participant'
import type { Expense, ExpenseDistribution } from '@/types/expense'
import type { Settlement } from '@/types/settlement'
import type { Event } from '@/types/trip'
import type { Wallet, WalletTransaction, WalletPet } from '@/kopikas/types'

let _id = 0
function nextId(): string {
  return `test-${++_id}`
}

export function resetFactoryIds() {
  _id = 0
}

export function buildParticipant(overrides: Partial<Participant> = {}): Participant {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_id: 'trip-1',
    name: `Participant ${id}`,
    is_adult: true,
    ...overrides,
  }
}

export function buildExpense(
  overrides: Partial<Expense> & { distribution?: ExpenseDistribution } = {}
): Expense {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_id: 'trip-1',
    description: `Expense ${id}`,
    amount: 100,
    currency: 'EUR',
    paid_by: 'p1',
    distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    category: 'Food',
    expense_date: '2025-07-15',
    created_at: '2025-07-15T10:00:00Z',
    updated_at: '2025-07-15T10:00:00Z',
    ...overrides,
  }
}

export function buildSettlement(overrides: Partial<Settlement> = {}): Settlement {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_id: 'trip-1',
    from_participant_id: 'p2',
    to_participant_id: 'p1',
    amount: 50,
    currency: 'EUR',
    settlement_date: '2025-07-20',
    created_at: '2025-07-20T10:00:00Z',
    updated_at: '2025-07-20T10:00:00Z',
    ...overrides,
  }
}

export function buildEvent(overrides: Partial<Event> = {}): Event {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_code: `test-trip-${id}-Ab1234`,
    name: `Trip ${id}`,
    start_date: '2025-07-01',
    end_date: '2025-07-10',
    event_type: 'trip',
    tracking_mode: 'individuals',
    default_currency: 'EUR',
    exchange_rates: {},
    enable_meals: true,
    enable_activities: true,
    enable_shopping: true,
    default_split_all: true,
    account_for_family_size: false,
    created_at: '2025-06-01T00:00:00Z',
    ...overrides,
  }
}

// Backward-compatible alias
export const buildTrip = buildEvent

export function buildWallet(overrides: Partial<Wallet> = {}): Wallet {
  const id = overrides.id ?? nextId()
  return {
    id,
    wallet_code: `test-wallet-${id}-Ab1234`,
    name: `Kid ${id}`,
    currency: 'EUR',
    created_by: 'parent-user-1',
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

export function buildWalletTransaction(
  overrides: Partial<WalletTransaction> = {}
): WalletTransaction {
  const id = overrides.id ?? nextId()
  return {
    id,
    wallet_id: 'wallet-1',
    type: 'expense',
    amount: 5,
    description: `Transaction ${id}`,
    category: 'food',
    receipt_image_path: null,
    receipt_batch_id: null,
    vendor: null,
    created_at: '2026-03-15T10:00:00Z',
    ...overrides,
  } as WalletTransaction
}

export function buildWalletPet(overrides: Partial<WalletPet> = {}): WalletPet {
  return {
    wallet_id: 'wallet-1',
    name: 'Blob',
    level: 1,
    xp: 0,
    starter_emoji: '🫧',
    last_weekly_xp_check: null,
    last_streak_xp_check: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
    ...overrides,
  }
}
