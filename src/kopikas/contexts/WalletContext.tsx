// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import type { Wallet, WalletTransaction, CreateTransactionInput, KopikasCategory } from '../types'

interface WalletContextValue {
  wallet: Wallet | null
  transactions: WalletTransaction[]
  loading: boolean
  error: string | null
  balance: number
  lastAllowance: WalletTransaction | null
  addTransaction: (input: CreateTransactionInput) => Promise<WalletTransaction | null>
  updateTransactionCategory: (txId: string, oldCategory: KopikasCategory, newCategory: KopikasCategory, description: string | null) => Promise<boolean>
  updateTransactionAmount: (txId: string, newAmount: number) => Promise<boolean>
  updateTransactionDate: (txId: string, newDate: string) => Promise<boolean>
  updateTransactionGroup: (txIds: string[], vendor: string, purchaseDate: string) => Promise<boolean>
  deleteTransaction: (txId: string) => Promise<boolean>
  deleteWallet: () => Promise<boolean>
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
      localStorage.setItem('kopikas:last-wallet', walletCode)
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
        'Tehingute laadimine aegus. Kontrolli ühendust ja proovi uuesti.'
      )

      if (signal.aborted) return

      if (fetchError) {
        logger.error('Failed to fetch wallet transactions', { wallet_id: walletId, error: fetchError.message })
        setTransactions([])
        setError('Tehingute laadimine ebaõnnestus.')
      } else {
        setTransactions((data as WalletTransaction[]) || [])
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch wallet transactions', { wallet_id: walletId, error: err instanceof Error ? err.message : String(err) })
      setTransactions([])
      setError('Tehingute laadimine ebaõnnestus.')
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
        'Rahakoti laadimine aegus. Kontrolli ühendust ja proovi uuesti.'
      )

      if (signal.aborted) return

      if (fetchError) {
        logger.error('Failed to fetch wallet', { wallet_code: walletCode, error: fetchError.message })
        setWallet(null)
        setError('Rahakotti ei leitud.')
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
      setError('Rahakoti laadimine ebaõnnestus.')
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
      receipt_batch_id: input.receipt_batch_id ?? null,
      vendor: input.vendor ?? null,
      purchase_date: input.purchase_date ?? null,
      purchase_group_id: input.purchase_group_id ?? null,
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
        'Tehingu lisamine aegus. Kontrolli ühendust ja proovi uuesti.',
        controller
      )

      if (insertError) {
        logger.error('Failed to add wallet transaction', { wallet_id: input.wallet_id, error: insertError.message })
        setError('Tehingu lisamine ebaõnnestus.')
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
      setError('Tehingu lisamine ebaõnnestus.')
      // Roll back optimistic insert
      setTransactions((prev) => prev.filter((tx) => tx.id !== optimisticId))
      return null
    }
  }

  const updateTransactionCategory = async (
    txId: string,
    oldCategory: KopikasCategory,
    newCategory: KopikasCategory,
    description: string | null,
  ): Promise<boolean> => {
    if (!wallet || oldCategory === newCategory) return false

    // Optimistic update
    setTransactions((prev) =>
      prev.map((tx) => tx.id === txId ? { ...tx, category: newCategory } : tx)
    )

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_transactions' as any) as any)
          .update({ category: newCategory })
          .eq('id', txId),
        15000,
        'Kategooria muutmine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to update transaction category', { tx_id: txId, error: updateError.message })
        setError('Kategooria muutmine ebaõnnestus.')
        // Roll back
        setTransactions((prev) =>
          prev.map((tx) => tx.id === txId ? { ...tx, category: oldCategory } : tx)
        )
        return false
      }

      // Log correction for AI learning (fire and forget)
      ;(supabase.from('wallet_category_corrections' as any) as any)
        .insert({
          wallet_id: wallet.id,
          item_description: description || '',
          original_category: oldCategory,
          corrected_category: newCategory,
        })
        .then(() => {})

      return true
    } catch (err) {
      logger.error('Failed to update transaction category', { tx_id: txId, error: err instanceof Error ? err.message : String(err) })
      setError('Kategooria muutmine ebaõnnestus.')
      setTransactions((prev) =>
        prev.map((tx) => tx.id === txId ? { ...tx, category: oldCategory } : tx)
      )
      return false
    }
  }

  const updateTransactionAmount = async (txId: string, newAmount: number): Promise<boolean> => {
    const tx = transactions.find((t) => t.id === txId)
    if (!tx || tx.amount === newAmount || newAmount <= 0) return false
    const oldAmount = tx.amount

    // Optimistic update
    setTransactions((prev) =>
      prev.map((t) => t.id === txId ? { ...t, amount: newAmount } : t)
    )

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_transactions' as any) as any)
          .update({ amount: newAmount })
          .eq('id', txId),
        15000,
        'Summa muutmine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to update transaction amount', { tx_id: txId, error: updateError.message })
        setError('Summa muutmine ebaõnnestus.')
        setTransactions((prev) =>
          prev.map((t) => t.id === txId ? { ...t, amount: oldAmount } : t)
        )
        return false
      }

      return true
    } catch (err) {
      logger.error('Failed to update transaction amount', { tx_id: txId, error: err instanceof Error ? err.message : String(err) })
      setError('Summa muutmine ebaõnnestus.')
      setTransactions((prev) =>
        prev.map((t) => t.id === txId ? { ...t, amount: oldAmount } : t)
      )
      return false
    }
  }

  const updateTransactionDate = async (txId: string, newDate: string): Promise<boolean> => {
    const oldTx = transactions.find(t => t.id === txId)
    if (!oldTx) return false

    setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, purchase_date: newDate } : tx))

    try {
      const { error: updateError } = await withTimeout(
        (supabase.from('wallet_transactions' as any) as any)
          .update({ purchase_date: newDate })
          .eq('id', txId),
        15000,
        'Kuupäeva muutmine aegus.'
      ) as { error: any }

      if (updateError) {
        logger.error('Failed to update transaction date', { txId, error: updateError.message })
        setTransactions(prev => prev.map(tx => tx.id === txId ? oldTx : tx))
        setError('Kuupäeva muutmine ebaõnnestus.')
        return false
      }
      return true
    } catch (err) {
      logger.error('Failed to update transaction date', { txId, error: err instanceof Error ? err.message : String(err) })
      setTransactions(prev => prev.map(tx => tx.id === txId ? oldTx : tx))
      setError('Kuupäeva muutmine ebaõnnestus.')
      return false
    }
  }

  const updateTransactionGroup = async (txIds: string[], vendor: string, purchaseDate: string): Promise<boolean> => {
    const groupId = crypto.randomUUID()
    const oldTxs = transactions.filter(t => txIds.includes(t.id))

    setTransactions(prev => prev.map(tx =>
      txIds.includes(tx.id) ? { ...tx, purchase_group_id: groupId, vendor, purchase_date: purchaseDate } : tx
    ))

    try {
      for (const txId of txIds) {
        const { error: updateError } = await withTimeout(
          (supabase.from('wallet_transactions' as any) as any)
            .update({ purchase_group_id: groupId, vendor, purchase_date: purchaseDate })
            .eq('id', txId),
          15000,
          'Grupi muutmine aegus.'
        ) as { error: any }

        if (updateError) {
          logger.error('Failed to update transaction group', { txId, error: updateError.message })
          setTransactions(prev => prev.map(tx => {
            const old = oldTxs.find(o => o.id === tx.id)
            return old ? old : tx
          }))
          setError('Grupi muutmine ebaõnnestus.')
          return false
        }
      }
      return true
    } catch (err) {
      logger.error('Failed to update transaction group', { error: err instanceof Error ? err.message : String(err) })
      setTransactions(prev => prev.map(tx => {
        const old = oldTxs.find(o => o.id === tx.id)
        return old ? old : tx
      }))
      setError('Grupi muutmine ebaõnnestus.')
      return false
    }
  }

  const deleteTransaction = async (txId: string): Promise<boolean> => {
    const oldTx = transactions.find(t => t.id === txId)
    if (!oldTx) return false

    setTransactions(prev => prev.filter(tx => tx.id !== txId))

    try {
      const { error: deleteError } = await withTimeout(
        (supabase.from('wallet_transactions' as any) as any)
          .delete()
          .eq('id', txId),
        15000,
        'Tehingu kustutamine aegus.'
      ) as { error: any }

      if (deleteError) {
        logger.error('Failed to delete transaction', { txId, error: deleteError.message })
        setTransactions(prev => [oldTx, ...prev])
        setError('Tehingu kustutamine ebaõnnestus.')
        return false
      }
      return true
    } catch (err) {
      logger.error('Failed to delete transaction', { txId, error: err instanceof Error ? err.message : String(err) })
      setTransactions(prev => [oldTx, ...prev])
      setError('Tehingu kustutamine ebaõnnestus.')
      return false
    }
  }

  const deleteWallet = async (): Promise<boolean> => {
    if (!wallet) return false
    try {
      const { error: deleteError } = await withTimeout(
        (supabase.from('wallets' as any) as any)
          .delete()
          .eq('id', wallet.id),
        15000,
        'Rahakoti kustutamine aegus. Kontrolli ühendust ja proovi uuesti.'
      ) as { error: any }

      if (deleteError) {
        logger.error('Failed to delete wallet', { wallet_id: wallet.id, error: deleteError.message })
        setError('Rahakoti kustutamine ebaõnnestus.')
        return false
      }

      return true
    } catch (err) {
      logger.error('Failed to delete wallet', { wallet_id: wallet?.id, error: err instanceof Error ? err.message : String(err) })
      setError('Rahakoti kustutamine ebaõnnestus.')
      return false
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
    updateTransactionCategory,
    updateTransactionAmount,
    updateTransactionDate,
    updateTransactionGroup,
    deleteTransaction,
    deleteWallet,
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
