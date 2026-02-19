import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseCategory,
} from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { withTimeout } from '@/lib/fetchWithTimeout'

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
  getFoodExpenses: () => Expense[]
  getExpenseById: (id: string) => Expense | undefined
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined)

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()

  // Fetch expenses for current trip
  const fetchExpenses = async () => {
    if (!currentTrip) {
      setExpenses([])
      setInitialLoadDone(true)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('expenses')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('expense_date', { ascending: false })
          .order('created_at', { ascending: false }),
        15000,
        'Loading expenses timed out. Please check your connection and try again.'
      )

      if (fetchError) throw fetchError

      setExpenses((data as unknown as Expense[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses')
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
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

      const { data, error: createError } = await withTimeout<any>(
        (supabase as any)
          .from('expenses')
          .insert([expenseData])
          .select()
          .single(),
        15000,
        'Saving expense timed out. Please check your connection and try again.'
      )

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

  // Helper: Get food expenses (for restaurant meal linking)
  const getFoodExpenses = () => {
    return expenses.filter(e => e.category === 'Food')
  }

  // Helper: Get expense by ID
  const getExpenseById = (id: string) => {
    return expenses.find(e => e.id === id)
  }

  // Fetch expenses when current trip changes
  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchExpenses()
    }
  }, [tripCode, currentTrip?.id])

  const value: ExpenseContextType = {
    expenses,
    loading: loading || (!!currentTrip && !initialLoadDone),
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
    getExpensesByCategory,
    getExpensesByPayer,
    searchExpenses,
    getFoodExpenses,
    getExpenseById,
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
