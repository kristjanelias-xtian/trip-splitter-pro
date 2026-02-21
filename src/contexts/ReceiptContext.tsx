import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ReceiptTask, ExtractedItem, MappedItem } from '@/types/receipt'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'

interface ReceiptContextType {
  pendingReceipts: ReceiptTask[]
  receiptByExpenseId: Record<string, ReceiptTask>
  loading: boolean
  error: string | null
  createReceiptTask: (tripId: string, imagePath?: string) => Promise<ReceiptTask | null>
  updateReceiptTask: (id: string, updates: Partial<ReceiptTask>) => Promise<boolean>
  completeReceiptTask: (id: string, expenseId: string) => Promise<boolean>
  dismissReceiptTask: (id: string) => Promise<boolean>
  refreshPendingReceipts: () => Promise<void>
}

const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined)

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptTask[]>([])
  const [completedReceipts, setCompletedReceipts] = useState<ReceiptTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const receiptByExpenseId = completedReceipts.reduce<Record<string, ReceiptTask>>((acc, task) => {
    if (task.expense_id) acc[task.expense_id] = task
    return acc
  }, {})

  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()

  const fetchPendingReceipts = async () => {
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
          .in('status', ['review', 'complete'])
          .order('created_at', { ascending: false }),
        15000,
        'Loading receipts timed out.'
      )

      if (fetchError) {
        setError('Failed to load pending receipts')
        logger.error('Failed to fetch pending receipts', { error: fetchError.message })
        return
      }

      const all = (data as ReceiptTask[]) ?? []
      setPendingReceipts(all.filter(t => t.status === 'review'))
      setCompletedReceipts(all.filter(t => t.status === 'complete'))
    } catch (err) {
      setError('Failed to load pending receipts')
      logger.error('Unhandled error fetching receipts', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingReceipts()
  }, [currentTrip?.id])

  const createReceiptTask = async (tripId: string, imagePath?: string): Promise<ReceiptTask | null> => {
    if (!user) {
      logger.error('Cannot create receipt task: user not authenticated')
      return null
    }
    try {
      const { data, error: insertError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .insert({
            trip_id: tripId,
            created_by: user.id,
            status: 'pending',
            receipt_image_path: imagePath ?? null,
          })
          .select()
          .single(),
        15000,
        'Creating receipt task timed out.'
      )

      if (insertError || !data) {
        logger.error('Failed to create receipt task', { error: insertError?.message })
        return null
      }

      logger.info('Receipt task created', { task_id: (data as ReceiptTask).id })
      return data as ReceiptTask
    } catch (err) {
      logger.error('Unhandled error creating receipt task', { error: String(err) })
      return null
    }
  }

  const updateReceiptTask = async (id: string, updates: Partial<ReceiptTask>): Promise<boolean> => {
    try {
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq('id', id),
        15000,
        'Updating receipt task timed out.'
      )

      if (updateError) {
        logger.error('Failed to update receipt task', { error: updateError.message })
        return false
      }

      // Refresh pending receipts in case status changed
      await fetchPendingReceipts()
      return true
    } catch (err) {
      logger.error('Unhandled error updating receipt task', { error: String(err) })
      return false
    }
  }

  const completeReceiptTask = async (id: string, expenseId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .update({
            status: 'complete',
            expense_id: expenseId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
        15000,
        'Completing receipt task timed out.'
      )

      if (updateError) {
        logger.error('Failed to complete receipt task', { error: updateError.message })
        return false
      }

      setPendingReceipts(prev => prev.filter(r => r.id !== id))
      // Refresh to pick up the now-complete task in completedReceipts
      await fetchPendingReceipts()
      return true
    } catch (err) {
      logger.error('Unhandled error completing receipt task', { error: String(err) })
      return false
    }
  }

  const dismissReceiptTask = async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await withTimeout(
        supabase
          .from('receipt_tasks')
          .update({
            status: 'failed',
            error_message: 'Dismissed by user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
        15000,
        'Dismissing receipt task timed out.'
      )

      if (updateError) {
        logger.error('Failed to dismiss receipt task', { error: updateError.message })
        return false
      }

      setPendingReceipts(prev => prev.filter(r => r.id !== id))
      return true
    } catch (err) {
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
        createReceiptTask,
        updateReceiptTask,
        completeReceiptTask,
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
