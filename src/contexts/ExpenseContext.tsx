import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseCategory,
} from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'

interface ExpenseContextType {
  expenses: Expense[]
  loading: boolean
  error: string | null
  createExpense: (input: CreateExpenseInput) => Promise<Expense | null>
  updateExpense: (id: string, input: UpdateExpenseInput) => Promise<boolean>
  deleteExpense: (id: string) => Promise<boolean>
  refreshExpenses: () => Promise<void>
  getExpensesByCategory: (category: ExpenseCategory) => Expense[]
  getExpensesByPayer: (payerId: string) => Expense[]
  searchExpenses: (query: string) => Expense[]
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined)

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()
  const { trips } = useTripContext()

  console.log('🔄 ExpenseProvider rendering - trips.length:', trips.length, 'tripCode:', tripCode, 'has currentTrip:', !!currentTrip)

  // Fetch expenses for current trip
  const fetchExpenses = async () => {
    console.log('fetchExpenses called, currentTrip:', currentTrip)

    if (!currentTrip) {
      console.log('No currentTrip, setting expenses to []')
      setExpenses([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching expenses for trip:', currentTrip.id)

      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      console.log('Fetched expenses:', data)
      console.log('Current trip ID:', currentTrip.id)
      setExpenses((data as unknown as Expense[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses')
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create expense
  const createExpense = async (input: CreateExpenseInput): Promise<Expense | null> => {
    try {
      setError(null)

      // Default expense_date to today if not provided
      const expenseData = {
        ...input,
        expense_date: input.expense_date || new Date().toISOString().split('T')[0],
      }

      const { data, error: createError } = await (supabase as any)
        .from('expenses')
        .insert([expenseData])
        .select()
        .single()

      if (createError) throw createError

      const newExpense = data as Expense
      setExpenses(prev => [newExpense, ...prev])

      return newExpense
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense')
      console.error('Error creating expense:', err)
      return null
    }
  }

  // Update expense
  const updateExpense = async (id: string, input: UpdateExpenseInput): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await (supabase as any)
        .from('expenses')
        .update(input)
        .eq('id', id)

      if (updateError) throw updateError

      setExpenses(prev =>
        prev.map(e => (e.id === id ? { ...e, ...input } : e))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense')
      console.error('Error updating expense:', err)
      return false
    }
  }

  // Delete expense
  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setExpenses(prev => prev.filter(e => e.id !== id))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense')
      console.error('Error deleting expense:', err)
      return false
    }
  }

  // Refresh expenses
  const refreshExpenses = async () => {
    await fetchExpenses()
  }

  // Helper: Filter by category
  const getExpensesByCategory = (category: ExpenseCategory) => {
    return expenses.filter(e => e.category === category)
  }

  // Helper: Filter by payer
  const getExpensesByPayer = (payerId: string) => {
    return expenses.filter(e => e.paid_by === payerId)
  }

  // Helper: Search by description or comment
  const searchExpenses = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return expenses.filter(
      e =>
        e.description.toLowerCase().includes(lowerQuery) ||
        (e.comment && e.comment.toLowerCase().includes(lowerQuery))
    )
  }

  // Fetch expenses when current trip changes
  useEffect(() => {
    console.log('ExpenseContext useEffect triggered, tripCode:', tripCode, 'has currentTrip:', !!currentTrip, 'trips loaded:', trips.length)
    if (tripCode && currentTrip) {
      console.log('Calling fetchExpenses with trip:', currentTrip.id)
      fetchExpenses()
    } else {
      console.log('Skipping fetch - tripCode:', tripCode, 'currentTrip:', !!currentTrip)
    }
  }, [tripCode, currentTrip?.id, trips.length])

  const value: ExpenseContextType = {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
    getExpensesByCategory,
    getExpensesByPayer,
    searchExpenses,
  }

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
}

export function useExpenseContext() {
  const context = useContext(ExpenseContext)
  if (context === undefined) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider')
  }
  return context
}
