import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ReceiptTask, ExtractedItem, MappedItem } from '@/types/receipt'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import { useAbortController } from '@/hooks/useAbortController'

interface ReceiptContextType {
  pendingReceipts: ReceiptTask[]
  receiptByExpenseId: Record<string, ReceiptTask>
  loading: boolean
  error: string | null
  clearError: () => void
  createReceiptTask: (tripId: string, imagePath?: string) => Promise<ReceiptTask>
  updateReceiptTask: (id: string, updates: ReceiptTaskUpdate) => Promise<boolean>
  completeReceiptTask: (id: string, expenseId: string, mappedItems?: MappedItem[]) => Promise<boolean>
  reopenReceiptTask: (id: string) => Promise<boolean>
  dismissReceiptTask: (id: string) => Promise<boolean>
  refreshPendingReceipts: () => Promise<void>
}

/** Fields that callers are allowed to update on a receipt task */
export type ReceiptTaskUpdate = Partial<Pick<ReceiptTask,
  | 'status'
  | 'extracted_merchant'
  | 'extracted_items'
  | 'extracted_total'
  | 'extracted_currency'
  | 'extracted_date'
  | 'confirmed_total'
  | 'tip_amount'
  | 'mapped_items'
  | 'error_message'
  | 'receipt_image_path'
  | 'expense_id'
>>

const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined)

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptTask[]>([])
  const [completedReceipts, setCompletedReceipts] = useState<ReceiptTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  const receiptByExpenseId = completedReceipts.reduce<Record<string, ReceiptTask>>((acc, task) => {
    if (task.expense_id) acc[task.expense_id] = task
    return acc
  }, {})

  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()
  const { newSignal, cancel } = useAbortController()

  const fetchPendingReceipts = async () => {
    const signal = newSignal()
    if (!currentTrip) {
      setPendingReceipts([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .in('status', ['review', 'complete', 'failed'])
          .order('created_at', { ascending: false })
          .abortSignal(signal),
        15000,
        'Loading receipts timed out.'
      )

      if (signal.aborted) return

      if (fetchError) {
        setError('Failed to load pending receipts')
        logger.error('Failed to fetch pending receipts', { error: fetchError.message })
        return
      }

      const all = (data as ReceiptTask[]) ?? []
      setPendingReceipts(all.filter(t => t.status === 'review' || t.status === 'failed'))
      setCompletedReceipts(all.filter(t => t.status === 'complete'))
    } catch (err) {
      if (signal.aborted) return
      setError('Failed to load pending receipts')
      logger.error('Unhandled error fetching receipts', { error: String(err) })
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchPendingReceipts()
    return cancel
  }, [currentTrip?.id])

  const createReceiptTask = async (tripId: string, imagePath?: string): Promise<ReceiptTask> => {
    if (!user) {
      logger.error('Cannot create receipt task: user not authenticated')
      throw new Error('You must be signed in to scan a receipt.')
    }
    try {
      const controller = new AbortController()
      const { data, error: insertError } = await withTimeout<any>(
        (supabase as any)
          .from('receipt_tasks')
          .insert({
            trip_id: tripId,
            created_by: user.id,
            status: 'pending',
            receipt_image_path: imagePath ?? null,
          })
          .select()
          .single()
          .abortSignal(controller.signal),
        15000,
        'Creating receipt task timed out.',
        controller
      )

      if (insertError) {
        logger.error('Failed to create receipt task', { error: insertError.message })
        throw new Error(insertError.message)
      }

      if (!data) {
        logger.error('Failed to create receipt task: no data returned')
        throw new Error('No data returned from receipt task insert')
      }

      logger.info('Receipt task created', { task_id: (data as ReceiptTask).id })
      return data as ReceiptTask
    } catch (err) {
      logger.error('Unhandled error creating receipt task', { error: String(err) })
      throw err
    }
  }

  const updateReceiptTask = async (id: string, updates: ReceiptTaskUpdate): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .update({ ...updates, updated_at: new Date().toISOString() } as Record<string, unknown>)
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Updating receipt task timed out.',
        controller
      )

      if (updateError) {
        const message = updateError.message || 'Failed to update receipt task'
        setError(message)
        logger.error('Failed to update receipt task', { error: updateError.message })
        return false
      }

      // Refresh pending receipts in case status changed — fire-and-forget
      fetchPendingReceipts()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update receipt task'
      setError(message)
      logger.error('Unhandled error updating receipt task', { error: String(err) })
      return false
    }
  }

  const completeReceiptTask = async (id: string, expenseId: string, mappedItems?: MappedItem[]): Promise<boolean> => {
    try {
      const completeController = new AbortController()
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .update({
            status: 'complete',
            expense_id: expenseId,
            ...(mappedItems ? { mapped_items: mappedItems } : {}),
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('id', id)
          .abortSignal(completeController.signal),
        15000,
        'Completing receipt task timed out.',
        completeController
      )

      if (updateError) {
        const message = updateError.message || 'Failed to complete receipt task'
        setError(message)
        logger.error('Failed to complete receipt task', { error: updateError.message })
        return false
      }

      setPendingReceipts(prev => prev.filter(r => r.id !== id))
      // Refresh to pick up the now-complete task in completedReceipts — fire-and-forget
      fetchPendingReceipts()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete receipt task'
      setError(message)
      logger.error('Unhandled error completing receipt task', { error: String(err) })
      return false
    }
  }

  const reopenReceiptTask = async (id: string): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .update({
            status: 'review',
            expense_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Reopening receipt task timed out.',
        controller
      )

      if (updateError) {
        const message = updateError.message || 'Failed to reopen receipt task'
        setError(message)
        logger.error('Failed to reopen receipt task', { error: updateError.message })
        return false
      }

      fetchPendingReceipts()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reopen receipt task'
      setError(message)
      logger.error('Unhandled error reopening receipt task', { error: String(err) })
      return false
    }
  }

  const dismissReceiptTask = async (id: string): Promise<boolean> => {
    const imagePath = pendingReceipts.find(r => r.id === id)?.receipt_image_path ?? null
    try {
      const controller = new AbortController()
      const { error: deleteError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .delete()
          .eq('id', id)
          .abortSignal(controller.signal),
        15000,
        'Dismissing receipt task timed out.',
        controller
      )

      if (deleteError) {
        const message = deleteError.message || 'Failed to dismiss receipt task'
        setError(message)
        logger.error('Failed to dismiss receipt task', { error: deleteError.message })
        return false
      }

      setPendingReceipts(prev => prev.filter(r => r.id !== id))

      // Best-effort: delete the image from the receipts bucket
      if (imagePath) {
        const { error: storageError } = await supabase.storage.from('receipts').remove([imagePath])
        if (storageError) {
          logger.warn('Failed to delete receipt image from storage', { imagePath, error: storageError.message })
        }
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss receipt task'
      setError(message)
      logger.error('Unhandled error dismissing receipt task', { error: String(err) })
      return false
    }
  }

  return (
    <ReceiptContext.Provider
      value={{
        pendingReceipts,
        receiptByExpenseId,
        loading,
        error,
        clearError,
        createReceiptTask,
        updateReceiptTask,
        completeReceiptTask,
        reopenReceiptTask,
        dismissReceiptTask,
        refreshPendingReceipts: fetchPendingReceipts,
      }}
    >
      {children}
    </ReceiptContext.Provider>
  )
}

export function useReceiptContext() {
  const ctx = useContext(ReceiptContext)
  if (!ctx) throw new Error('useReceiptContext must be used within ReceiptProvider')
  return ctx
}

// Re-export types for convenience
export type { ExtractedItem, MappedItem }
