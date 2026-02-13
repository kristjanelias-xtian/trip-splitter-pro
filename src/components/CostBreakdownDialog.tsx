import { useMemo } from 'react'
import { Receipt, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ParticipantBalance, formatBalance, getBalanceColorClass, convertToBaseCurrency, calculateExpenseShares } from '@/services/balanceCalculator'
import { Expense } from '@/types/expense'
import { Participant, Family } from '@/types/participant'

interface CostBreakdownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: ParticipantBalance
  expenses: Expense[]
  participants: Participant[]
  families: Family[]
  trackingMode: 'individuals' | 'families'
  defaultCurrency: string
  exchangeRates: Record<string, number>
}

interface ExpenseShareItem {
  expense: Expense
  share: number // in base currency
}

export function CostBreakdownDialog({
  open,
  onOpenChange,
  balance,
  expenses,
  participants,
  families,
  trackingMode,
  defaultCurrency,
  exchangeRates,
}: CostBreakdownDialogProps) {
  const { paidExpenses, shareExpenses } = useMemo(() => {
    const paid: Expense[] = []
    const shares: ExpenseShareItem[] = []

    expenses.forEach(expense => {
      // Check if this entity paid the expense
      const payer = participants.find(p => p.id === expense.paid_by)
      if (payer) {
        const payerEntityId = trackingMode === 'families' && payer.family_id
          ? payer.family_id
          : payer.id
        if (payerEntityId === balance.id) {
          paid.push(expense)
        }
      }

      // Check if this entity has a share in the expense
      const expenseShares = calculateExpenseShares(expense, participants, families, trackingMode)
      const entityShare = expenseShares.get(balance.id)
      if (entityShare && entityShare > 0) {
        const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
        const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1
        shares.push({
          expense,
          share: entityShare * conversionFactor,
        })
      }
    })

    // Sort by date descending
    paid.sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    shares.sort((a, b) => b.expense.expense_date.localeCompare(a.expense.expense_date))

    return { paidExpenses: paid, shareExpenses: shares }
  }, [expenses, participants, families, trackingMode, balance.id, defaultCurrency, exchangeRates])

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency }).format(amount)

  const fmtOriginal = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  const balanceColorClass = getBalanceColorClass(balance.balance)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {balance.name}
            {balance.isFamily && <Badge variant="soft">Family</Badge>}
          </DialogTitle>
          <DialogDescription>
            Balance: <span className={`font-semibold ${balanceColorClass}`}>{formatBalance(balance.balance, defaultCurrency)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Expenses Paid */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Wallet size={16} />
            Expenses paid
            <span className="text-muted-foreground font-normal">({paidExpenses.length})</span>
          </h4>
          {paidExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">No expenses paid.</p>
          ) : (
            <div className="space-y-2">
              {paidExpenses.map(expense => {
                const converted = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
                const isForeign = expense.currency !== defaultCurrency
                return (
                  <div key={expense.id} className="flex items-start justify-between gap-2 pl-6 py-1.5 text-sm border-b border-border last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{expense.description}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{expense.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium tabular-nums">{fmt(converted)}</div>
                      {isForeign && (
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {fmtOriginal(expense.amount, expense.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between pl-6 pt-2 text-sm font-semibold text-foreground">
                <span>Total paid</span>
                <span className="tabular-nums">{fmt(balance.totalPaid)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Share of Expenses */}
        <div className="mt-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Receipt size={16} />
            Your share of expenses
            <span className="text-muted-foreground font-normal">({shareExpenses.length})</span>
          </h4>
          {shareExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">No expense shares.</p>
          ) : (
            <div className="space-y-2">
              {shareExpenses.map(({ expense, share }) => {
                const converted = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
                return (
                  <div key={expense.id} className="flex items-start justify-between gap-2 pl-6 py-1.5 text-sm border-b border-border last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{expense.description}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{expense.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(expense.expense_date).toLocaleDateString()} · Total: {fmt(converted)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium tabular-nums">{fmt(share)}</div>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between pl-6 pt-2 text-sm font-semibold text-foreground">
                <span>Total share</span>
                <span className="tabular-nums">{fmt(balance.totalShare)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
