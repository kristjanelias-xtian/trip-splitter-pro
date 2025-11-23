import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Settlement,
  CreateSettlementInput,
  UpdateSettlementInput,
} from '@/types/settlement'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'

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
  const [error, setError] = useState<string | null>(null)

  const { currentTrip, tripId } = useCurrentTrip()
  const { trips } = useTripContext()

  // Fetch settlements for current trip
  const fetchSettlements = async () => {
    if (!currentTrip) {
      setSettlements([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('settlements')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('settlement_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setSettlements((data as Settlement[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settlements')
      console.error('Error fetching settlements:', err)
    } finally {
      setLoading(false)
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

      const { data, error: createError } = await (supabase as any)
        .from('settlements')
        .insert([settlementData])
        .select()
        .single()

      if (createError) throw createError

      const newSettlement = data as Settlement
      setSettlements(prev => [newSettlement, ...prev])

      return newSettlement
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create settlement')
      console.error('Error creating settlement:', err)
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
      console.error('Error updating settlement:', err)
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

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete settlement')
      console.error('Error deleting settlement:', err)
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
    if (tripId && currentTrip) {
      fetchSettlements()
    } else {
      setSettlements([])
    }
  }, [tripId, currentTrip?.id, trips.length])

  const value: SettlementContextType = {
    settlements,
    loading,
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
