import { useState } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import type { SettlementTransaction } from '@/services/settlementOptimizer'
import type { CreateSettlementInput } from '@/types/settlement'
import { SettlementPlan } from '@/components/SettlementPlan'
import { SettlementForm } from '@/components/SettlementForm'

export function SettlementsPage() {
  const { currentTrip } = useCurrentTrip()
  const { participants, families } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { createSettlement, settlements } = useSettlementContext()
  const [recordingSettlement, setRecordingSettlement] = useState(false)
  const [showCustomSettlement, setShowCustomSettlement] = useState(false)

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settlements</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-900 dark:text-yellow-200">
            No trip selected. Please select a trip to view settlements.
          </p>
        </div>
      </div>
    )
  }

  // Calculate balances (including settlements)
  const balanceCalculation = calculateBalances(
    expenses,
    participants,
    families,
    currentTrip.tracking_mode,
    settlements
  )

  // Calculate optimal settlement
  const optimalSettlement = calculateOptimalSettlement(
    balanceCalculation.balances,
    'EUR' // TODO: Get from trip settings
  )

  const handleRecordSettlement = async (transaction: SettlementTransaction) => {
    if (recordingSettlement) return

    const confirmed = confirm(
      `Record settlement: ${transaction.fromName} pays ${transaction.toName} ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }).format(transaction.amount)}?`
    )

    if (!confirmed) return

    setRecordingSettlement(true)
    try {
      const result = await createSettlement({
        trip_id: currentTrip.id,
        from_participant_id: transaction.fromId,
        to_participant_id: transaction.toId,
        amount: transaction.amount,
        currency: 'EUR',
        note: 'Settlement recorded from optimal plan',
      })

      if (result) {
        alert('Settlement recorded successfully!')
      } else {
        alert('Failed to record settlement')
      }
    } catch (error) {
      console.error('Error recording settlement:', error)
      alert('Failed to record settlement')
    } finally {
      setRecordingSettlement(false)
    }
  }

  const handleCustomSettlement = async (input: CreateSettlementInput) => {
    try {
      const result = await createSettlement(input)

      if (result) {
        alert('Custom settlement recorded successfully!')
        setShowCustomSettlement(false)
      } else {
        alert('Failed to record settlement')
      }
    } catch (error) {
      console.error('Error recording custom settlement:', error)
      alert('Failed to record settlement')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settlements</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Optimal settlement plan and payment recording for {currentTrip.name}
        </p>
      </div>

      {/* Settlement Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total to Settle</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
            }).format(
              balanceCalculation.balances
                .filter(b => b.balance < 0)
                .reduce((sum, b) => sum + Math.abs(b.balance), 0)
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total amount owed by all debtors
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Settlements Needed</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {optimalSettlement.totalTransactions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {optimalSettlement.totalTransactions === 0 ? 'All settled!' : 'transactions required'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Settlements Recorded</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {settlements.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total payments recorded
          </div>
        </div>
      </div>

      {/* Optimal Settlement Plan */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <SettlementPlan plan={optimalSettlement} onRecordSettlement={handleRecordSettlement} />
        </div>
      )}

      {/* Custom Settlement Form */}
      {participants.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Record Custom Settlement
            </h3>
            <button
              onClick={() => setShowCustomSettlement(!showCustomSettlement)}
              className="text-sm text-neutral hover:underline"
            >
              {showCustomSettlement ? '▼ Hide' : '▶ Add Custom Payment'}
            </button>
          </div>

          {showCustomSettlement && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Record a payment that happened outside of the optimal settlement plan (e.g., partial payments, cash transfers, etc.)
                {currentTrip.tracking_mode === 'families' && (
                  <span className="block mt-2 text-xs">
                    💡 In families mode, select the adult who made/received the payment. The balance will update for their family.
                  </span>
                )}
              </p>
              <SettlementForm
                onSubmit={handleCustomSettlement}
                onCancel={() => setShowCustomSettlement(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Settlement History
          </h3>
          <div className="space-y-2">
            {settlements.map((settlement) => {
              const fromParticipant = participants.find(p => p.id === settlement.from_participant_id)
              const toParticipant = participants.find(p => p.id === settlement.to_participant_id)

              return (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {fromParticipant?.name || 'Unknown'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-600">→</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {toParticipant?.name || 'Unknown'}
                      </span>
                    </div>
                    {settlement.note && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {settlement.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: settlement.currency,
                      }).format(settlement.amount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(settlement.settlement_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No expenses recorded yet. Add expenses first to see settlement recommendations.
          </p>
        </div>
      )}
    </div>
  )
}
