import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Settlement,
  CreateSettlementInput,
  UpdateSettlementInput,
} from '@/types/settlement'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'

interface SettlementContextType {
  settlements: Settlement[]
  loading: boolean
  error: string | null
  createSettlement: (input: CreateSettlementInput) => Promise<Settlement | null>
  updateSettlement: (id: string, input: UpdateSettlementInput) => Promise<boolean>
  deleteSettlement: (id: string) => Promise<boolean>
  refreshSettlements: () => Promise<void>
  getSettlementsByParticipant: (participantId: string) => Settlement[]
}

const SettlementContext = createContext<SettlementContextType | undefined>(undefined)

export function SettlementProvider({ children }: { children: ReactNode }) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripCode } = useCurrentTrip()

  // Fetch settlements for current trip
  const fetchSettlements = async () => {
    if (!currentTrip) {
      setSettlements([])
      setInitialLoadDone(true)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('settlements')
          .select('*')
          .eq('trip_id', currentTrip.id)
          .order('settlement_date', { ascending: false })
          .order('created_at', { ascending: false }),
        15000,
        'Loading settlements timed out. Please check your connection and try again.'
      )

      if (fetchError) throw fetchError

      setSettlements((data as Settlement[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settlements')
      logger.error('Failed to fetch settlements', { trip_id: currentTrip?.id, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }

  // Create settlement
  const createSettlement = async (input: CreateSettlementInput): Promise<Settlement | null> => {
    try {
      setError(null)

      // Default settlement_date to today if not provided
      const settlementData = {
        ...input,
        settlement_date: input.settlement_date || new Date().toISOString().split('T')[0],
      }

      const { data, error: createError } = await withTimeout<any>(
        (supabase as any)
          .from('settlements')
          .insert([settlementData])
          .select()
          .single(),
        15000,
        'Saving settlement timed out. Please check your connection and try again.'
      )

      if (createError) throw createError

      const newSettlement = data as Settlement
      setSettlements(prev => [newSettlement, ...prev])
      logger.info('Settlement created', { settlement_id: newSettlement.id, trip_id: newSettlement.trip_id, amount: newSettlement.amount })

      return newSettlement
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create settlement')
      logger.error('Failed to create settlement', { trip_id: currentTrip?.id, error: err instanceof Error ? err.message : String(err) })
      return null
    }
  }

  // Update settlement
  const updateSettlement = async (id: string, input: UpdateSettlementInput): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await (supabase as any)
        .from('settlements')
        .update(input)
        .eq('id', id)

      if (updateError) throw updateError

      setSettlements(prev =>
        prev.map(s => (s.id === id ? { ...s, ...input } : s))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settlement')
      logger.error('Failed to update settlement', { settlement_id: id, trip_id: currentTrip?.id, error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  // Delete settlement
  const deleteSettlement = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('settlements')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSettlements(prev => prev.filter(s => s.id !== id))
      logger.info('Settlement deleted', { settlement_id: id, trip_id: currentTrip?.id })

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete settlement')
      logger.error('Failed to delete settlement', { settlement_id: id, trip_id: currentTrip?.id, error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  // Refresh settlements
  const refreshSettlements = async () => {
    await fetchSettlements()
  }

  // Helper: Get settlements involving a specific participant (either sending or receiving)
  const getSettlementsByParticipant = (participantId: string) => {
    return settlements.filter(
      s => s.from_participant_id === participantId || s.to_participant_id === participantId
    )
  }

  // Fetch settlements when current trip changes
  useEffect(() => {
    if (tripCode && currentTrip) {
      setInitialLoadDone(false)
      fetchSettlements()
    } else {
      setSettlements([])
      setInitialLoadDone(true)
    }
  }, [tripCode, currentTrip?.id])

  const value: SettlementContextType = {
    settlements,
    loading: loading || (!!currentTrip && !initialLoadDone),
    error,
    createSettlement,
    updateSettlement,
    deleteSettlement,
    refreshSettlements,
    getSettlementsByParticipant,
  }

  return <SettlementContext.Provider value={value}>{children}</SettlementContext.Provider>
}

export function useSettlementContext() {
  const context = useContext(SettlementContext)
  if (context === undefined) {
    throw new Error('useSettlementContext must be used within a SettlementProvider')
  }
  return context
}
