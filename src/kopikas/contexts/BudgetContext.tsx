// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import { useWallet } from '../hooks/useWallet'
import { useKopikasAuth } from '../app/KopikasAuthProvider'
import { calculateBudgetState, processCompletedWeeks } from '../lib/budgetCalculator'
import type { WalletBudget, WalletSavingsEntry, WalletSavingsGoal, BudgetState } from '../types'

interface BudgetContextValue {
  budget: WalletBudget | null
  budgetState: BudgetState | null
  savings: WalletSavingsEntry[]
  goals: WalletSavingsGoal[]
  pendingWithdrawal: WalletSavingsEntry | null
  loading: boolean
  // Parent actions (auth-required)
  setBudget: (weeklyAmount: number) => Promise<void>
  approveWithdrawal: (id: string) => Promise<void>
  denyWithdrawal: (id: string) => Promise<void>
  // Kid actions (no auth needed)
  createWithdrawalRequest: (amount: number, reason: string) => Promise<void>
  createGoal: (name: string, emoji: string, targetAmount: number) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  completeGoal: (id: string) => Promise<void>
  refreshBudget: () => Promise<void>
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined)

/**
 * Returns YYYY-MM-DD for next Monday, or today if today is Monday.
 */
function getNextMonday(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  if (day === 1) return now.toISOString().slice(0, 10)
  const diff = day === 0 ? 1 : 8 - day
  now.setUTCDate(now.getUTCDate() + diff)
  return now.toISOString().slice(0, 10)
}

interface BudgetProviderProps {
  children: ReactNode
}

export function BudgetProvider({ children }: BudgetProviderProps) {
  const { wallet, transactions } = useWallet()
  const { user } = useKopikasAuth()
  const [budget, setBudgetState] = useState<WalletBudget | null>(null)
  const [savings, setSavings] = useState<WalletSavingsEntry[]>([])
  const [goals, setGoals] = useState<WalletSavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const { newSignal, cancel } = useAbortController()

  const walletId = wallet?.id ?? null

  const pendingWithdrawal = useMemo(() => {
    return savings.find(
      (e) => e.type === 'withdrawal' && e.status === 'pending_approval'
    ) ?? null
  }, [savings])

  const budgetState = useMemo(() => {
    if (!budget) return null
    return calculateBudgetState(
      budget.weekly_amount,
      budget.start_date,
      transactions,
      savings,
      new Date()
    )
  }, [budget, transactions, savings])

  // --- Data fetching ---

  const fetchBudget = async (wId: string, signal: AbortSignal) => {
    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase.from('wallet_budgets' as any) as any)
          .select('*')
          .eq('wallet_id', wId)
          .maybeSingle()
          .abortSignal(signal),
        15000,
        'Eelarve laadimine aegus.'
      )
      if (signal.aborted) return
      if (fetchError) {
        logger.error('Failed to fetch wallet budget', { wallet_id: wId, error: fetchError.message })
        setBudgetState(null)
      } else {
        setBudgetState((data as WalletBudget) ?? null)
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet budget', { wallet_id: wId, error: err instanceof Error ? err.message : String(err) })
      setBudgetState(null)
    }
  }

  const fetchSavings = async (wId: string, signal: AbortSignal) => {
    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase.from('wallet_savings' as any) as any)
          .select('*')
          .eq('wallet_id', wId)
          .order('created_at', { ascending: false })
          .abortSignal(signal),
        15000,
        'Kokkuhoiu laadimine aegus.'
      )
      if (signal.aborted) return
      if (fetchError) {
        logger.error('Failed to fetch wallet savings', { wallet_id: wId, error: fetchError.message })
        setSavings([])
      } else {
        setSavings((data as WalletSavingsEntry[]) || [])
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet savings', { wallet_id: wId, error: err instanceof Error ? err.message : String(err) })
      setSavings([])
    }
  }

  const fetchGoals = async (wId: string, signal: AbortSignal) => {
    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase.from('wallet_savings_goals' as any) as any)
          .select('*')
          .eq('wallet_id', wId)
          .abortSignal(signal),
        15000,
        'Eesmarkide laadimine aegus.'
      )
      if (signal.aborted) return
      if (fetchError) {
        logger.error('Failed to fetch wallet savings goals', { wallet_id: wId, error: fetchError.message })
        setGoals([])
      } else {
        setGoals((data as WalletSavingsGoal[]) || [])
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet savings goals', { wallet_id: wId, error: err instanceof Error ? err.message : String(err) })
      setGoals([])
    }
  }

  const fetchAll = async () => {
    if (!walletId) {
      setLoading(false)
      return
    }
    const signal = newSignal()
    setLoading(true)
    await Promise.all([
      fetchBudget(walletId, signal),
      fetchSavings(walletId, signal),
      fetchGoals(walletId, signal),
    ])
    if (!signal.aborted) {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    return cancel
  }, [walletId])

  // --- Catch-up logic: process completed weeks (parent sessions only) ---

  useEffect(() => {
    if (loading || !budget || !walletId || !user) return

    const entries = processCompletedWeeks(
      budget.weekly_amount,
      budget.start_date,
      transactions,
      savings,
      new Date()
    )

    if (entries.length === 0) return

    const insertEntries = async () => {
      try {
        const rows = entries.map((e) => ({
          wallet_id: walletId,
          amount: e.amount,
          type: e.type,
          status: 'completed',
          week_start: e.week_start,
        }))

        const { error: insertError } = await withTimeout(
          (supabase.from('wallet_savings' as any) as any).insert(rows),
          15000,
          'Kokkuhoiu kirjete lisamine aegus.'
        ) as { error: any }

        if (insertError) {
          logger.error('Failed to insert catch-up savings entries', { wallet_id: walletId, error: insertError.message })
          return
        }

        // Refresh savings after insert
        const signal = newSignal()
        await fetchSavings(walletId, signal)
      } catch (err) {
        logger.error('Failed to insert catch-up savings entries', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
      }
    }

    insertEntries()
  }, [loading, budget, walletId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Actions ---

  const setBudget = useCallback(async (weeklyAmount: number) => {
    if (!walletId || !user) return

    if (budget) {
      // Optimistic update
      const oldBudget = budget
      setBudgetState({ ...budget, weekly_amount: weeklyAmount, updated_at: new Date().toISOString() })

      try {
        const { error: updateError } = await withTimeout(
          (supabase.from('wallet_budgets' as any) as any)
            .update({ weekly_amount: weeklyAmount })
            .eq('wallet_id', walletId),
          15000,
          'Eelarve muutmine aegus.'
        ) as { error: any }

        if (updateError) {
          logger.error('Failed to update budget', { wallet_id: walletId, error: updateError.message })
          setBudgetState(oldBudget)
        }
      } catch (err) {
        logger.error('Failed to update budget', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
        setBudgetState(oldBudget)
      }
    } else {
      // Insert new budget
      const newBudget: WalletBudget = {
        wallet_id: walletId,
        weekly_amount: weeklyAmount,
        start_date: getNextMonday(),
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setBudgetState(newBudget)

      try {
        const { data, error: insertError } = await withTimeout<any>(
          (supabase.from('wallet_budgets' as any) as any)
            .insert([{
              wallet_id: walletId,
              weekly_amount: weeklyAmount,
              start_date: newBudget.start_date,
              created_by: user.id,
            }])
            .select()
            .single(),
          15000,
          'Eelarve loomine aegus.'
        )

        if (insertError) {
          logger.error('Failed to create budget', { wallet_id: walletId, error: insertError.message })
          setBudgetState(null)
        } else {
          setBudgetState(data as WalletBudget)
        }
      } catch (err) {
        logger.error('Failed to create budget', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
        setBudgetState(null)
      }
    }
  }, [walletId, user, budget])

  const createWithdrawalRequest = useCallback(async (amount: number, reason: string) => {
    if (!walletId) return

    // Guard: reject if there's already a pending withdrawal
    if (pendingWithdrawal) {
      logger.warn('Withdrawal request rejected: pending withdrawal exists', { wallet_id: walletId })
      return
    }

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticEntry: WalletSavingsEntry = {
      id: optimisticId,
      wallet_id: walletId,
      amount: -amount, // withdrawals are negative
      type: 'withdrawal',
      description: reason,
      status: 'pending_approval',
      approved_by: null,
      week_start: null,
      created_at: new Date().toISOString(),
    }
    setSavings((prev) => [optimisticEntry, ...prev])

    try {
      const { data, error: insertError } = await withTimeout<any>(
        (supabase.from('wallet_savings' as any) as any)
          .insert([{
            wallet_id: walletId,
            amount: -amount,
            type: 'withdrawal',
            description: reason,
            status: 'pending_approval',
          }])
          .select()
          .single(),
        15000,
        'Valjavotte taotluse loomine aegus.'
      )

      if (insertError) {
        logger.error('Failed to create withdrawal request', { wallet_id: walletId, error: insertError.message })
        setSavings((prev) => prev.filter((e) => e.id !== optimisticId))
      } else {
        setSavings((prev) => prev.map((e) => e.id === optimisticId ? (data as WalletSavingsEntry) : e))
      }
    } catch (err) {
      logger.error('Failed to create withdrawal request', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
      setSavings((prev) => prev.filter((e) => e.id !== optimisticId))
    }
  }, [walletId, pendingWithdrawal])

  const approveWithdrawal = useCallback(async (id: string) => {
    if (!user) return

    // Optimistic update
    const oldSavings = savings
    setSavings((prev) =>
      prev.map((e) => e.id === id ? { ...e, status: 'completed' as const, approved_by: user.id } : e)
    )

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_savings' as any) as any)
          .update({ status: 'completed', approved_by: user.id })
          .eq('id', id),
        15000,
        'Valjavotte kinnitamine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to approve withdrawal', { id, error: updateError.message })
        setSavings(oldSavings)
      }
    } catch (err) {
      logger.error('Failed to approve withdrawal', { id, error: err instanceof Error ? err.message : String(err) })
      setSavings(oldSavings)
    }
  }, [user, savings])

  const denyWithdrawal = useCallback(async (id: string) => {
    // Optimistic update
    const oldSavings = savings
    setSavings((prev) =>
      prev.map((e) => e.id === id ? { ...e, status: 'denied' as const } : e)
    )

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_savings' as any) as any)
          .update({ status: 'denied' })
          .eq('id', id),
        15000,
        'Valjavotte keelamine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to deny withdrawal', { id, error: updateError.message })
        setSavings(oldSavings)
      }
    } catch (err) {
      logger.error('Failed to deny withdrawal', { id, error: err instanceof Error ? err.message : String(err) })
      setSavings(oldSavings)
    }
  }, [savings])

  const createGoal = useCallback(async (name: string, emoji: string, targetAmount: number) => {
    if (!walletId) return

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticGoal: WalletSavingsGoal = {
      id: optimisticId,
      wallet_id: walletId,
      name,
      emoji,
      target_amount: targetAmount,
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    setGoals((prev) => [...prev, optimisticGoal])

    try {
      const { data, error: insertError } = await withTimeout<any>(
        (supabase.from('wallet_savings_goals' as any) as any)
          .insert([{
            wallet_id: walletId,
            name,
            emoji,
            target_amount: targetAmount,
          }])
          .select()
          .single(),
        15000,
        'Eesmargi loomine aegus.'
      )

      if (insertError) {
        logger.error('Failed to create savings goal', { wallet_id: walletId, error: insertError.message })
        setGoals((prev) => prev.filter((g) => g.id !== optimisticId))
      } else {
        setGoals((prev) => prev.map((g) => g.id === optimisticId ? (data as WalletSavingsGoal) : g))
      }
    } catch (err) {
      logger.error('Failed to create savings goal', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
      setGoals((prev) => prev.filter((g) => g.id !== optimisticId))
    }
  }, [walletId])

  const deleteGoal = useCallback(async (id: string) => {
    // Optimistic delete
    const oldGoals = goals
    setGoals((prev) => prev.filter((g) => g.id !== id))

    try {
      const { error: deleteError } = await withTimeout(
        (supabase.from('wallet_savings_goals' as any) as any)
          .delete()
          .eq('id', id),
        15000,
        'Eesmargi kustutamine aegus.'
      ) as { error: any }

      if (deleteError) {
        logger.error('Failed to delete savings goal', { id, error: deleteError.message })
        setGoals(oldGoals)
      }
    } catch (err) {
      logger.error('Failed to delete savings goal', { id, error: err instanceof Error ? err.message : String(err) })
      setGoals(oldGoals)
    }
  }, [goals])

  const completeGoal = useCallback(async (id: string) => {
    // Optimistic update
    const oldGoals = goals
    setGoals((prev) =>
      prev.map((g) => g.id === id ? { ...g, completed_at: new Date().toISOString() } : g)
    )

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_savings_goals' as any) as any)
          .update({ completed_at: new Date().toISOString() })
          .eq('id', id),
        15000,
        'Eesmargi taidetud markimine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to complete savings goal', { id, error: updateError.message })
        setGoals(oldGoals)
      }
    } catch (err) {
      logger.error('Failed to complete savings goal', { id, error: err instanceof Error ? err.message : String(err) })
      setGoals(oldGoals)
    }
  }, [goals])

  const refreshBudget = useCallback(async () => {
    await fetchAll()
  }, [walletId]) // eslint-disable-line react-hooks/exhaustive-deps

  const value: BudgetContextValue = {
    budget,
    budgetState,
    savings,
    goals,
    pendingWithdrawal,
    loading,
    setBudget,
    approveWithdrawal,
    denyWithdrawal,
    createWithdrawalRequest,
    createGoal,
    deleteGoal,
    completeGoal,
    refreshBudget,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}
