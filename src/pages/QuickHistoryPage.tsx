import { useState, useMemo } from 'react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { buildTransactionHistory } from '@/services/transactionHistoryBuilder'
import { TransactionItem } from '@/components/quick/TransactionItem'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

type FilterType = 'all' | 'expenses' | 'payments'

export function QuickHistoryPage() {
  const { currentTrip } = useCurrentTrip()
  const { myParticipant } = useMyParticipant()
  const { participants, families, loading: participantsLoading, error: participantError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: expensesLoading, error: expenseError, refreshExpenses } = useExpenseContext()
  const { settlements, loading: settlementsLoading, error: settlementError, refreshSettlements } = useSettlementContext()
  const [filter, setFilter] = useState<FilterType>('all')
  const [retrying, setRetrying] = useState(false)

  const contextError = participantError || expenseError || settlementError

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()])
    } finally {
      setRetrying(false)
    }
  }

  const loading = participantsLoading || expensesLoading || settlementsLoading

  const transactions = useMemo(() => {
    if (!currentTrip || !myParticipant) return []
    return buildTransactionHistory(
      expenses,
      settlements,
      participants,
      families,
      myParticipant,
      currentTrip.tracking_mode
    )
  }, [expenses, settlements, participants, families, myParticipant, currentTrip])

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions
    if (filter === 'expenses') return transactions.filter(t => t.type === 'expense')
    return transactions.filter(t => t.type === 'settlement')
  }, [transactions, filter])

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'payments', label: 'Payments' },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Expenses & Payments</h2>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <PageLoadingState />
      ) : contextError ? (
        <PageErrorState error={contextError} onRetry={handleRetry} retrying={retrying} />
      ) : !myParticipant ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Link yourself to a participant to see transaction history.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-8">
            <FileText size={32} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No transactions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map(tx => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              defaultCurrency={currentTrip?.default_currency}
              exchangeRates={currentTrip?.exchange_rates}
            />
          ))}
        </div>
      )}
    </div>
  )
}
