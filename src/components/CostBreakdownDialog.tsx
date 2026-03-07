import { useMemo } from 'react'
import { Receipt, Wallet, Users, Check, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ParticipantBalance, formatBalance, getBalanceColorClass, convertToBaseCurrency, calculateExpenseShares, buildEntityMap, calculateWithinGroupBalances } from '@/services/balanceCalculator'
import { Expense } from '@/types/expense'
import { Participant } from '@/types/participant'
import { Settlement } from '@/types/settlement'
import { buildShortNameMap } from '@/lib/participantUtils'

interface CostBreakdownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: ParticipantBalance
  expenses: Expense[]
  participants: Participant[]
  trackingMode: 'individuals' | 'families'
  defaultCurrency: string
  exchangeRates: Record<string, number>
  settlements?: Settlement[]
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
  trackingMode,
  defaultCurrency,
  exchangeRates,
  settlements = [],
}: CostBreakdownDialogProps) {
  const entityMap = useMemo(() => buildEntityMap(participants, trackingMode), [participants, trackingMode])

  const { paidExpenses, shareExpenses } = useMemo(() => {
    const paid: Expense[] = []
    const shares: ExpenseShareItem[] = []

    expenses.forEach(expense => {
      // Check if this entity paid the expense
      const payerEntityId = entityMap.participantToEntityId.get(expense.paid_by) ?? expense.paid_by
      if (payerEntityId === balance.id) {
        paid.push(expense)
      }

      // Check if this entity has a share in the expense
      const expenseShares = calculateExpenseShares(expense, participants, trackingMode, entityMap)
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
  }, [expenses, participants, entityMap, trackingMode, balance.id, defaultCurrency, exchangeRates])

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency }).format(amount)

  const fmtOriginal = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  const balanceColorClass = getBalanceColorClass(balance.balance)

  // Within-group breakdown (only for family/group entities)
  const groupName = useMemo(() => {
    if (!balance.isFamily) return null
    const p = participants.find(pp => pp.id === balance.id)
    return p?.wallet_group ?? null
  }, [balance.id, balance.isFamily, participants])

  const withinGroupBalances = useMemo(() => {
    if (!groupName) return null
    return calculateWithinGroupBalances(
      expenses, participants, groupName, defaultCurrency, exchangeRates, settlements
    )
  }, [expenses, participants, groupName, defaultCurrency, exchangeRates, settlements])

  const groupMembers = useMemo(() => {
    if (!groupName) return []
    return participants.filter(p => p.wallet_group === groupName)
  }, [participants, groupName])

  const hasChildren = groupMembers.some(p => !p.is_adult) && groupMembers.some(p => p.is_adult)

  const withinGroupSettlements = useMemo(() => {
    if (!groupName) return []
    const memberIds = new Set(groupMembers.map(p => p.id))
    return settlements.filter(
      s => memberIds.has(s.from_participant_id) && memberIds.has(s.to_participant_id)
    )
  }, [settlements, groupMembers, groupName])

  const participantNameMap = useMemo(() => buildShortNameMap(participants), [participants])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{balance.name}</DialogTitle>
          <DialogDescription>
            Balance: <span className={`font-semibold ${balanceColorClass}`}>{formatBalance(balance.balance, defaultCurrency)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Within-group breakdown */}
        {withinGroupBalances && withinGroupBalances.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/30">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Users size={16} />
              Within-group balances
            </h4>
            {(() => {
              const allEven = withinGroupBalances.every(b => Math.abs(b.balance) < 0.01)
              const hasActivity = withinGroupBalances.some(b => b.totalPaid > 0 || b.totalShare > 0)
              if (!hasActivity) {
                return <p className="text-xs text-muted-foreground">No shared expenses yet</p>
              }
              if (allEven) {
                return (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Check size={14} />
                    <span className="text-sm">Evenly split</span>
                  </div>
                )
              }
              return (
                <div className="space-y-1.5">
                  {withinGroupBalances.map(b => (
                    <div key={b.id} className="flex justify-between items-baseline text-sm">
                      <span>{b.name}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Covered {fmt(b.totalPaid)} · Share {fmt(b.totalShare)}
                        </span>
                        <span className={`tabular-nums font-medium ${getBalanceColorClass(b.balance)}`}>
                          {formatBalance(b.balance, defaultCurrency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
            {withinGroupSettlements.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Settlements</p>
                <div className="space-y-1">
                  {withinGroupSettlements.map(s => {
                    const converted = convertToBaseCurrency(s.amount, s.currency, defaultCurrency, exchangeRates)
                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <span>{participantNameMap.get(s.from_participant_id) ?? 'Unknown'}</span>
                          <ArrowRight size={12} className="text-muted-foreground" />
                          <span>{participantNameMap.get(s.to_participant_id) ?? 'Unknown'}</span>
                        </div>
                        <span className="tabular-nums">{fmt(converted)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {hasChildren && (
              <p className="text-xs text-muted-foreground mt-2">Children's shares are split among adults</p>
            )}
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group paid</span>
                <span className="tabular-nums font-medium">{fmt(balance.totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group share</span>
                <span className="tabular-nums font-medium">{fmt(balance.totalShare)}</span>
              </div>
            </div>
          </div>
        )}

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
