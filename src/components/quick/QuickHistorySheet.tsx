import { useState, useMemo } from 'react'
import { X, FileText } from 'lucide-react'
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type FilterType = 'all' | 'expenses' | 'payments'

interface QuickHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickHistorySheet({ open, onOpenChange }: QuickHistorySheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { myParticipant } = useMyParticipant()
  const { participants, loading: participantsLoading, error: participantError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: expensesLoading, error: expenseError, refreshExpenses } = useExpenseContext()
  const { settlements, loading: settlementsLoading, error: settlementError, refreshSettlements } = useSettlementContext()
  const [filter, setFilter] = useState<FilterType>('all')
  const [retrying, setRetrying] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

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
      myParticipant,
      currentTrip.tracking_mode
    )
  }, [expenses, settlements, participants, myParticipant, currentTrip])

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

  const closeBtn = (
    <button
      onClick={() => onOpenChange(false)}
      aria-label="Close"
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      <X className="w-4 h-4 text-muted-foreground" />
    </button>
  )

  const scrollContent = (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
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
      <p className="text-xs text-muted-foreground mb-4">Showing only expenses you're included in.</p>

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

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex flex-col p-0 rounded-t-2xl"
          style={{ height: '75dvh' }}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">Expenses & Payments</SheetTitle>
            {closeBtn}
          </div>
          {scrollContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="flex flex-col max-h-[85vh] p-0 gap-0">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <DialogTitle className="text-base font-semibold">Expenses & Payments</DialogTitle>
          {closeBtn}
        </div>
        {scrollContent}
      </DialogContent>
    </Dialog>
  )
}
