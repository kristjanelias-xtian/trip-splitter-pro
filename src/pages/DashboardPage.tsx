import { useState } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import type { SettlementTransaction } from '@/services/settlementOptimizer'
import { BalanceCard } from '@/components/BalanceCard'
import { SettlementPlan } from '@/components/SettlementPlan'

export function DashboardPage() {
  const { currentTrip } = useCurrentTrip()
  const { participants, families } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { createSettlement } = useSettlementContext()
  const [recordingSettlement, setRecordingSettlement] = useState(false)

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-900 dark:text-yellow-200">
            No trip selected. Please select a trip to view the dashboard.
          </p>
        </div>
      </div>
    )
  }

  // Calculate balances
  const balanceCalculation = calculateBalances(
    expenses,
    participants,
    families,
    currentTrip.tracking_mode
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
        note: 'Settlement recorded from dashboard',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentTrip.name}</p>
      </div>

      {/* Trip Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
            }).format(balanceCalculation.totalExpenses)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Participants</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentTrip.tracking_mode === 'families' ? families.length : participants.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentTrip.tracking_mode === 'families' ? 'families' : 'individuals'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Settlements Needed</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {optimalSettlement.totalTransactions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {optimalSettlement.totalTransactions === 0 ? 'All settled!' : 'transactions'}
          </div>
        </div>
      </div>

      {/* Settlement Plan */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <SettlementPlan plan={optimalSettlement} onRecordSettlement={handleRecordSettlement} />
        </div>
      )}

      {/* Balances */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Balances
        </h3>

        {balanceCalculation.balances.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No expenses recorded yet. Add your first expense to see balances.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balanceCalculation.balances.map(balance => (
              <BalanceCard key={balance.id} balance={balance} currency="EUR" />
            ))}
          </div>
        )}
      </div>

      {/* Suggested Next Payer */}
      {balanceCalculation.suggestedNextPayer && expenses.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Smart Payer Suggestion
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            For the next expense, <strong>{balanceCalculation.suggestedNextPayer.name}</strong>{' '}
            should pay to balance things out.
          </p>
        </div>
      )}
    </div>
  )
}
