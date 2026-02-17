import type { Participant, Family } from '@/types/participant'
import type { Expense, ExpenseDistribution } from '@/types/expense'
import type { Settlement } from '@/types/settlement'
import type { Trip } from '@/types/trip'

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
    family_id: null,
    name: `Participant ${id}`,
    is_adult: true,
    ...overrides,
  }
}

export function buildFamily(overrides: Partial<Family> = {}): Family {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_id: 'trip-1',
    family_name: `Family ${id}`,
    adults: 2,
    children: 1,
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

export function buildTrip(overrides: Partial<Trip> = {}): Trip {
  const id = overrides.id ?? nextId()
  return {
    id,
    trip_code: `test-trip-${id}-Ab1234`,
    name: `Trip ${id}`,
    start_date: '2025-07-01',
    end_date: '2025-07-10',
    tracking_mode: 'individuals',
    default_currency: 'EUR',
    exchange_rates: {},
    enable_meals: true,
    enable_activities: true,
    enable_shopping: true,
    default_split_all: true,
    created_at: '2025-06-01T00:00:00Z',
    ...overrides,
  }
}
