import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { UserCheck, X, ChevronDown, Check } from 'lucide-react'
import { ParticipantBalance, formatBalance, getBalanceColorClass, calculateWithinGroupBalances } from '@/services/balanceCalculator'
import { Participant } from '@/types/participant'
import { Expense } from '@/types/expense'

interface QuickGroupMembersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balances: ParticipantBalance[]
  myParticipantId: string | null
  currency: string
  participants: Participant[]
  expenses?: Expense[]
  exchangeRates?: Record<string, number>
}

export function QuickGroupMembersSheet({
  open,
  onOpenChange,
  balances,
  myParticipantId,
  currency,
  participants,
  expenses = [],
  exchangeRates = {},
}: QuickGroupMembersSheetProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  function isLinked(balanceId: string): boolean {
    return !!participants.find(p => p.id === balanceId)?.user_id
  }

  function statusText(balance: number): string {
    if (Math.abs(balance) < 0.005) return 'Settled up'
    const amount = formatBalance(Math.abs(balance), currency)
    return balance > 0 ? `Owed ${amount}` : `Owes ${amount}`
  }

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Find wallet_group name for a family entity
  function getGroupName(entityId: string): string | null {
    const participant = participants.find(p => p.id === entityId)
    return participant?.wallet_group ?? null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
      >
        {/* Sticky header — never scrolls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <SheetTitle className="text-base font-semibold">Group ({balances.length} {balances.length === 1 ? 'member' : 'members'})</SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {balances.map((b, i) => {
            const isMe = b.id === myParticipantId
            const linked = isLinked(b.id)
            const settled = Math.abs(b.balance) < 0.005
            const isExpanded = expandedGroups.has(b.id)
            const groupName = b.isFamily ? getGroupName(b.id) : null

            return (
              <div key={b.id}>
                <div
                  className={`flex items-center justify-between px-6 py-3.5 gap-3 ${b.isFamily ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
                  onClick={b.isFamily ? () => toggleGroup(b.id) : undefined}
                >
                  {/* Left: name + badges */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{b.name}</span>
                    {linked && (
                      <span title="Account linked">
                        <UserCheck size={12} className="text-green-600 dark:text-green-400 shrink-0" />
                      </span>
                    )}
                    {isMe && (
                      <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded shrink-0">
                        You
                      </span>
                    )}
                    {b.isFamily && (
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>

                  {/* Right: amount + status */}
                  <div className="text-right shrink-0">
                    <p className={`font-medium tabular-nums text-sm ${settled ? 'text-muted-foreground' : getBalanceColorClass(b.balance)}`}>
                      {settled ? '—' : formatBalance(b.balance, currency)}
                    </p>
                    <p className={`text-xs mt-0.5 ${settled ? 'text-muted-foreground' : getBalanceColorClass(b.balance)}`}>
                      {statusText(b.balance)}
                    </p>
                  </div>
                </div>

                {/* Within-group breakdown */}
                {b.isFamily && isExpanded && groupName && (
                  <WithinGroupBreakdown
                    groupName={groupName}
                    expenses={expenses}
                    participants={participants}
                    currency={currency}
                    exchangeRates={exchangeRates}
                  />
                )}

                {i < balances.length - 1 && (
                  <div className="border-b border-border mx-6" />
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function WithinGroupBreakdown({
  groupName,
  expenses,
  participants,
  currency,
  exchangeRates,
}: {
  groupName: string
  expenses: Expense[]
  participants: Participant[]
  currency: string
  exchangeRates: Record<string, number>
}) {
  const groupBalances = calculateWithinGroupBalances(
    expenses, participants, groupName, currency, exchangeRates
  )
  const allEven = groupBalances.every(b => Math.abs(b.balance) < 0.01)
  const hasGroupExpenses = groupBalances.some(b => b.totalPaid > 0 || b.totalShare > 0)
  const groupMembers = participants.filter(p => p.wallet_group === groupName)
  const hasChildren = groupMembers.some(p => !p.is_adult) && groupMembers.some(p => p.is_adult)

  return (
    <div className="mx-6 mb-3 p-3 rounded-lg bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground mb-2">Within-group balances</p>
      {!hasGroupExpenses ? (
        <p className="text-xs text-muted-foreground">No shared expenses yet</p>
      ) : allEven ? (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <Check size={14} />
          <span className="text-sm">Evenly split</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {groupBalances.map(b => (
            <div key={b.id} className="flex justify-between items-center text-sm">
              <span>{b.name}</span>
              <span className={`tabular-nums font-medium ${getBalanceColorClass(b.balance)}`}>
                {formatBalance(b.balance, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasChildren && (
        <p className="text-xs text-muted-foreground mt-2">Children's shares are split among adults</p>
      )}
    </div>
  )
}
