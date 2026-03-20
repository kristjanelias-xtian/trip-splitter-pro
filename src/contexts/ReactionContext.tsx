// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAbortController } from '@/hooks/useAbortController'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import type { Reaction, ExpenseReactions } from '@/types/reaction'

type ReactionMap = Map<string, ExpenseReactions>

interface ReactionContextType {
  reactions: ReactionMap
  loading: boolean
  addReaction: (expenseId: string, participantId: string, emoji: string) => Promise<void>
  removeReaction: (expenseId: string, participantId: string, emoji: string) => Promise<void>
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined)

function groupReactions(rows: Reaction[]): ReactionMap {
  const map: ReactionMap = new Map()
  for (const row of rows) {
    let expenseReactions = map.get(row.expense_id)
    if (!expenseReactions) {
      expenseReactions = {}
      map.set(row.expense_id, expenseReactions)
    }
    if (!expenseReactions[row.emoji]) {
      expenseReactions[row.emoji] = { count: 0, participantIds: [] }
    }
    expenseReactions[row.emoji].count++
    expenseReactions[row.emoji].participantIds.push(row.participant_id)
  }
  return map
}

export function ReactionProvider({ children }: { children: ReactNode }) {
  const { currentTrip } = useCurrentTrip()
  const [reactions, setReactions] = useState<ReactionMap>(new Map())
  const [loading, setLoading] = useState(false)
  const rawRef = useRef<Reaction[]>([])
  const { newSignal, cancel } = useAbortController()

  const applyRaw = useCallback((rows: Reaction[]) => {
    rawRef.current = rows
    setReactions(groupReactions(rows))
  }, [])

  useEffect(() => {
    if (!currentTrip?.id) {
      applyRaw([])
      return
    }

    const fetchReactions = async () => {
      setLoading(true)
      try {
        const signal = newSignal()
        const result = await withTimeout<{ data: unknown; error: unknown }>(
          (supabase
            .from('expense_reactions' as any) as any)
            .select('id, expense_id, participant_id, emoji, created_at, expenses!inner(trip_id)')
            .abortSignal(signal)
            .eq('expenses.trip_id', currentTrip.id),
          15000,
          'Loading reactions timed out'
        )
        const { data, error } = result as { data: Reaction[] | null; error: { message: string } | null }
        if (error) {
          logger.error('Failed to fetch reactions', { error })
          return
        }
        applyRaw(data || [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('Error fetching reactions', { error: err })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReactions()
    return cancel
  }, [currentTrip?.id])

  const addReaction = useCallback(async (expenseId: string, participantId: string, emoji: string) => {
    const optimisticReaction: Reaction = {
      id: crypto.randomUUID(),
      expense_id: expenseId,
      participant_id: participantId,
      emoji: emoji as Reaction['emoji'],
      created_at: new Date().toISOString(),
    }
    const next = [...rawRef.current, optimisticReaction]
    applyRaw(next)

    const result = await withTimeout<{ error: unknown }>(
      (supabase.from('expense_reactions' as any) as any).insert({
        expense_id: expenseId,
        participant_id: participantId,
        emoji,
      }),
      15000,
      'Adding reaction timed out'
    )
    const { error } = result as { error: { message: string } | null }

    if (error) {
      logger.error('Failed to add reaction', { error })
      // Roll back
      applyRaw(rawRef.current.filter(r => r.id !== optimisticReaction.id))
    }
  }, [applyRaw])

  const removeReaction = useCallback(async (expenseId: string, participantId: string, emoji: string) => {
    const toRemove = rawRef.current.find(
      r => r.expense_id === expenseId && r.participant_id === participantId && r.emoji === emoji
    )
    if (!toRemove) return

    applyRaw(rawRef.current.filter(r => r.id !== toRemove.id))

    const result = await withTimeout<{ error: unknown }>(
      (supabase
        .from('expense_reactions' as any) as any)
        .delete()
        .match({ expense_id: expenseId, participant_id: participantId, emoji }),
      15000,
      'Removing reaction timed out'
    )
    const { error } = result as { error: { message: string } | null }

    if (error) {
      logger.error('Failed to remove reaction', { error })
      // Roll back
      applyRaw([...rawRef.current, toRemove])
    }
  }, [applyRaw])

  const value = useMemo(
    () => ({ reactions, loading, addReaction, removeReaction }),
    [reactions, loading, addReaction, removeReaction]
  )

  return <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>
}

export function useReactionContext() {
  const context = useContext(ReactionContext)
  if (context === undefined) {
    throw new Error('useReactionContext must be used within a ReactionProvider')
  }
  return context
}
