import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ExpenseProvider, useExpenseContext } from './ExpenseContext'
import { buildExpense } from '@/test/factories'
import type { Expense } from '@/types/expense'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

const mockCurrentTrip = vi.hoisted(() => ({
  currentTrip: null as any,
  tripCode: null as string | null,
  loading: false,
}))

vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => mockCurrentTrip,
}))

vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({ trips: [] }),
}))

const sampleExpenses: Expense[] = [
  buildExpense({ id: 'e1', description: 'Dinner', category: 'Food', comment: 'Great place' }),
  buildExpense({ id: 'e2', description: 'Taxi', category: 'Transport' }),
  buildExpense({ id: 'e3', description: 'Breakfast', category: 'Food', comment: null }),
]

function TestConsumer() {
  const {
    expenses, loading, getExpensesByCategory, searchExpenses,
    getFoodExpenses, getExpenseById,
  } = useExpenseContext()

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{expenses.length}</span>
      <span data-testid="food-count">{getFoodExpenses().length}</span>
      <span data-testid="search-count">{searchExpenses('dinner').length}</span>
      <span data-testid="transport-count">{getExpensesByCategory('Transport').length}</span>
      <span data-testid="found">{getExpenseById('e1')?.description ?? 'null'}</span>
    </div>
  )
}

describe('ExpenseContext', () => {
  beforeEach(() => {
    mockCurrentTrip.currentTrip = null
    mockCurrentTrip.tripCode = null
    mockSupabase.from.mockReset()
  })

  it('clears expenses when no currentTrip', async () => {
    render(
      <ExpenseProvider>
        <TestConsumer />
      </ExpenseProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0')
    })
  })

  it('fetches and filters expenses when currentTrip is set', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockCurrentTrip.tripCode = 'test-trip-Ab1234'

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({ abortSignal: () => Promise.resolve({ data: sampleExpenses, error: null }) }),
          }),
        }),
      }),
    })

    render(
      <ExpenseProvider>
        <TestConsumer />
      </ExpenseProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('3')
    })

    expect(screen.getByTestId('food-count').textContent).toBe('2')
    expect(screen.getByTestId('search-count').textContent).toBe('1')
    expect(screen.getByTestId('transport-count').textContent).toBe('1')
    expect(screen.getByTestId('found').textContent).toBe('Dinner')
  })
})
