// SPDX-License-Identifier: Apache-2.0
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { buildWriteDiff } from '@/services/participantReassignment'
import type { ReassignmentPlan, Snapshot } from '@/services/participantReassignment'
import { executeReassignment } from '@/services/reassignmentRpc'
import { logger } from '@/lib/logger'

export function useReassignParticipant() {
  const { participants, refreshParticipants } = useParticipantContext()
  const { expenses, refreshExpenses } = useExpenseContext()
  const { settlements, refreshSettlements } = useSettlementContext()
  const { currentTrip } = useCurrentTrip()

  const previewSnapshot = (): Snapshot => ({ participants, expenses, settlements })

  const reassign = async (plan: ReassignmentPlan): Promise<{ ok: boolean; error?: string }> => {
    if (!currentTrip) return { ok: false, error: 'No active trip' }
    try {
      const diff = buildWriteDiff(previewSnapshot(), plan)
      await executeReassignment(currentTrip.id, diff)
      await Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()])
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reassign participant'
      logger.error('Participant reassignment failed', { error: message })
      return { ok: false, error: message }
    }
  }

  return { reassign, previewSnapshot }
}
