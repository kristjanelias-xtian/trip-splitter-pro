// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { UserCheck, ChevronDown, Check } from 'lucide-react'
import { ParticipantBalance, formatBalance, getBalanceColorClass, calculateWithinGroupBalances } from '@/services/balanceCalculator'
import { Participant } from '@/types/participant'
import { Expense } from '@/types/expense'
import { Settlement } from '@/types/settlement'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'

interface QuickGroupMembersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balances: ParticipantBalance[]
  myParticipantId: string | null
  currency: string
  participants: Participant[]
  expenses?: Expense[]
  exchangeRates?: Record<string, number>
  settlements?: Settlement[]
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
  settlements = [],
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
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Group (${balances.length} ${balances.length === 1 ? 'member' : 'members'})`}
      scrollClassName=""
    >
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
              {/* Left: avatar + name + badges */}
              <div className="flex items-center gap-2 min-w-0">
                <ParticipantAvatar participant={{ name: b.name, avatar_url: participants.find(p => p.id === b.id)?.avatar_url ?? null }} size="sm" />
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
                settlements={settlements}
              />
            )}

            {i < balances.length - 1 && (
              <div className="border-b border-border mx-6" />
            )}
          </div>
        )
      })}
    </ResponsiveOverlay>
  )
}

function WithinGroupBreakdown({
  groupName,
  expenses,
  participants,
  currency,
  exchangeRates,
  settlements,
}: {
  groupName: string
  expenses: Expense[]
  participants: Participant[]
  currency: string
  exchangeRates: Record<string, number>
  settlements: Settlement[]
}) {
  const groupBalances = calculateWithinGroupBalances(
    expenses, participants, groupName, currency, exchangeRates, settlements
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
