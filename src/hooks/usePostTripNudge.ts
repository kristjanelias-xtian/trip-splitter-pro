// SPDX-License-Identifier: Apache-2.0
import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances, buildEntityMap } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import { getTripPhase, type TripPhase } from '@/lib/activeTripDetection'

const DISMISS_KEY_PREFIX = 'spl1t:dismiss-settle-nudge:'

export function usePostTripNudge() {
  const { user } = useAuth()
  const { currentTrip } = useCurrentTrip()
  const { myParticipant } = useMyParticipant()
  const { participants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()

  const tripId = currentTrip?.id ?? ''
  const [dismissed, setDismissed] = useState(
    () => !!tripId && localStorage.getItem(`${DISMISS_KEY_PREFIX}${tripId}`) === 'true'
  )

  const dismiss = useCallback(() => {
    if (tripId) {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${tripId}`, 'true')
    }
    setDismissed(true)
  }, [tripId])

  const phase: TripPhase = currentTrip ? getTripPhase(currentTrip) : 'upcoming'

  const balanceCalc = useMemo(() => {
    if (!currentTrip || phase !== 'ended') return null
    return calculateBalances(
      expenses,
      participants,
      currentTrip.tracking_mode,
      settlements,
      currentTrip.default_currency,
      currentTrip.exchange_rates
    )
  }, [currentTrip, phase, expenses, participants, settlements])

  const hasOutstandingBalances = useMemo(() => {
    if (!balanceCalc) return false
    return balanceCalc.balances.some(b => Math.abs(b.balance) > 0.01)
  }, [balanceCalc])

  const isCreator = !!user && !!currentTrip?.created_by && user.id === currentTrip.created_by

  const myBalance = useMemo(() => {
    if (!balanceCalc || !myParticipant || !currentTrip) return null
    const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
    const myEntityId = entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id
    const bal = balanceCalc.balances.find(b => b.id === myEntityId)
    return bal ? Math.round(bal.balance * 100) / 100 : null
  }, [balanceCalc, myParticipant, currentTrip, participants])

  const totalOwed = useMemo(() => {
    if (!balanceCalc) return 0
    return Math.abs(
      balanceCalc.balances
        .filter(b => b.balance < 0)
        .reduce((sum, b) => sum + b.balance, 0)
    )
  }, [balanceCalc])

  const transactionsNeeded = useMemo(() => {
    if (!balanceCalc || !currentTrip) return 0
    const plan = calculateOptimalSettlement(
      balanceCalc.balances,
      currentTrip.default_currency,
      'optimal'
    )
    return plan.totalTransactions
  }, [balanceCalc, currentTrip])

  const remindersEnabled = currentTrip?.enable_settlement_reminders !== false

  const showCreatorBanner = phase === 'ended' && isCreator && hasOutstandingBalances && !dismissed && remindersEnabled
  const showDebtorBanner = phase === 'ended' && myBalance !== null && myBalance < -0.01 && !dismissed && remindersEnabled

  return {
    phase,
    hasOutstandingBalances,
    isCreator,
    myBalance,
    totalOwed,
    transactionsNeeded,
    dismissed,
    dismiss,
    showCreatorBanner,
    showDebtorBanner,
  }
}
