// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import type { Wallet, WalletTransaction, CreateTransactionInput } from '../types'

interface WalletContextValue {
  wallet: Wallet | null
  transactions: WalletTransaction[]
  loading: boolean
  error: string | null
  balance: number
  lastAllowance: WalletTransaction | null
  addTransaction: (input: CreateTransactionInput) => Promise<WalletTransaction | null>
  refreshTransactions: () => Promise<void>
  clearError: () => void
}

export const WalletContext = createContext<WalletContextValue | undefined>(undefined)

interface WalletProviderProps {
  walletCode: string
  children: ReactNode
}

export function WalletProvider({ walletCode, children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { newSignal, cancel } = useAbortController()

  const clearError = () => setError(null)

  const balance = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      if (tx.type === 'allowance') return sum + tx.amount
      if (tx.type === 'expense') return sum - tx.amount
      return sum
    }, 0)
  }, [transactions])

  useEffect(() => {
    if (walletCode && !loading) {
      localStorage.setItem(`kopikas:balance:${walletCode}`, String(balance))
    }
  }, [walletCode, balance, loading])

  const lastAllowance = useMemo(() => {
    return transactions.find((tx) => tx.type === 'allowance') ?? null
  }, [transactions])

  const fetchTransactions = async (walletId: string, signal: AbortSignal) => {
    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase.from('wallet_transactions' as any) as any)
          .select('*')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false })
          .abortSignal(signal),
        15000,
        'Loading wallet transactions timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (fetchError) {
        logger.error('Failed to fetch wallet transactions', { wallet_id: walletId, error: fetchError.message })
        setTransactions([])
        setError('Failed to load transactions.')
      } else {
        setTransactions((data as WalletTransaction[]) || [])
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet transactions', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
      setTransactions([])
      setError('Failed to load transactions.')
    }
  }

  const fetchWallet = async () => {
    const signal = newSignal()
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase.from('wallets' as any) as any)
          .select('*')
          .eq('wallet_code', walletCode)
          .single()
          .abortSignal(signal),
        15000,
        'Loading wallet timed out. Please check your connection and try again.'
      )

      if (signal.aborted) return

      if (fetchError) {
        logger.error('Failed to fetch wallet', { wallet_code: walletCode, error: fetchError.message })
        setWallet(null)
        setError('Wallet not found.')
        setLoading(false)
        return
      }

      const fetchedWallet = data as Wallet
      setWallet(fetchedWallet)
      await fetchTransactions(fetchedWallet.id, signal)
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet', { wallet_code: walletCode, error: err instanceof Error ? err.message : String(err) })
      setWallet(null)
      setError('Failed to load wallet.')
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }

  const refreshTransactions = async () => {
    if (!wallet) return
    const signal = newSignal()
    await fetchTransactions(wallet.id, signal)
  }

  useEffect(() => {
    fetchWallet()
    return cancel
  }, [walletCode])

  const addTransaction = async (input: CreateTransactionInput): Promise<WalletTransaction | null> => {
    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticTx: WalletTransaction = {
      id: optimisticId,
      wallet_id: input.wallet_id,
      type: input.type,
      amount: input.amount,
      description: input.description ?? null,
      category: input.category ?? null,
      receipt_image_path: input.receipt_image_path ?? null,
      created_at: new Date().toISOString(),
    }
    setTransactions((prev) => [optimisticTx, ...prev])

    try {
      const controller = new AbortController()
      const { data, error: insertError } = await withTimeout<any>(
        (supabase.from('wallet_transactions' as any) as any)
          .insert([input])
          .select()
          .single()
          .abortSignal(controller.signal),
        15000,
        'Adding transaction timed out. Please check your connection and try again.',
        controller
      )

      if (insertError) {
        logger.error('Failed to add wallet transaction', { wallet_id: input.wallet_id, error: insertError.message })
        setError('Failed to add transaction.')
        // Roll back optimistic insert
        setTransactions((prev) => prev.filter((tx) => tx.id !== optimisticId))
        return null
      }

      const savedTx = data as WalletTransaction
      // Replace optimistic entry with real one
      setTransactions((prev) => prev.map((tx) => tx.id === optimisticId ? savedTx : tx))
      return savedTx
    } catch (err) {
      logger.error('Failed to add wallet transaction', { wallet_id: input.wallet_id, error: err instanceof Error ? err.message : String(err) })
      setError('Failed to add transaction.')
      // Roll back optimistic insert
      setTransactions((prev) => prev.filter((tx) => tx.id !== optimisticId))
      return null
    }
  }

  const value: WalletContextValue = {
    wallet,
    transactions,
    loading,
    error,
    balance,
    lastAllowance,
    addTransaction,
    refreshTransactions,
    clearError,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletContext() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider')
  }
  return context
}
