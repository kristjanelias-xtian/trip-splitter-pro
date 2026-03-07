import { useState } from 'react'
import { PartyPopper, Lightbulb, Check, Bell, X } from 'lucide-react'
import { OptimalSettlementPlan, SettlementTransaction } from '@/services/settlementOptimizer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'

export interface BankDetails {
  holder: string
  iban: string
}

interface SettlementPlanProps {
  plan: OptimalSettlementPlan
  greedyPlan?: OptimalSettlementPlan
  onSettle?: (transaction: SettlementTransaction) => void
  bankDetailsMap?: Record<string, BankDetails>
  linkedParticipantIds?: Set<string>
  fromEmailMap?: Record<string, { name: string; email: string }[]>
  onRemind?: (transaction: SettlementTransaction, emails: string[]) => Promise<void>
  avatarMap?: Record<string, string | null>
}

export function SettlementPlan({ plan, greedyPlan, onSettle, bankDetailsMap, linkedParticipantIds, fromEmailMap, onRemind, avatarMap }: SettlementPlanProps) {
  const [mode, setMode] = useState<'optimal' | 'greedy'>('optimal')
  const showToggle = greedyPlan && greedyPlan.totalTransactions !== plan.totalTransactions
  const activePlan = mode === 'greedy' && greedyPlan ? greedyPlan : plan

  if (plan.transactions.length === 0) {
    return (
      <div className="bg-positive/10 border border-positive/30 rounded-lg p-6 text-center">
        <PartyPopper size={48} className="mx-auto text-positive mb-2" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          All Settled!
        </h3>
        <p className="text-sm text-muted-foreground">
          Everyone is squared up. No payments needed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold text-foreground shrink-0">
          Settlement Plan
        </h3>
        <div className="flex items-center gap-3">
          {showToggle && (
            <div className="flex rounded-full border border-border bg-muted/50 p-0.5 text-xs">
              <button
                onClick={() => setMode('optimal')}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  mode === 'optimal'
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fewer
              </button>
              <button
                onClick={() => setMode('greedy')}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  mode === 'greedy'
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Standard
              </button>
            </div>
          )}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {activePlan.totalTransactions} {activePlan.totalTransactions === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Lightbulb size={16} className="text-accent mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">
          {mode === 'optimal'
            ? 'This plan uses the minimum number of transactions to settle all balances.'
            : 'Standard settlement plan — each person settles with the largest counterparty first.'}
        </p>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {activePlan.transactions.map((transaction, index) => (
          <SettlementTransactionCard
            key={`${mode}-${index}`}
            transaction={transaction}
            currency={activePlan.currency}
            index={index + 1}
            onSettle={onSettle ? () => onSettle(transaction) : undefined}
            bankDetails={bankDetailsMap?.[transaction.toId]}
            linkedParticipantIds={linkedParticipantIds}
            fromEmails={fromEmailMap?.[transaction.fromId]}
            onRemind={onRemind ? (emails) => onRemind(transaction, emails) : undefined}
            avatarMap={avatarMap}
          />
        ))}
      </div>
    </div>
  )
}

interface SettlementTransactionCardProps {
  transaction: SettlementTransaction
  currency: string
  index: number
  onSettle?: () => void
  bankDetails?: BankDetails
  linkedParticipantIds?: Set<string>
  fromEmails?: { name: string; email: string }[]
  onRemind?: (emails: string[]) => Promise<void>
  avatarMap?: Record<string, string | null>
}

function SettlementTransactionCard({
  transaction,
  currency,
  index,
  onSettle,
  bankDetails,
  linkedParticipantIds,
  fromEmails,
  onRemind,
  avatarMap,
}: SettlementTransactionCardProps) {
  const [confirmingRemind, setConfirmingRemind] = useState(false)
  const [sending, setSending] = useState(false)
  const [remindResult, setRemindResult] = useState<'sent' | 'error' | null>(null)
  const [checkedEmails, setCheckedEmails] = useState<Record<string, boolean>>({})

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(transaction.amount)

  const handleSendReminder = async () => {
    if (!onRemind || !fromEmails || fromEmails.length === 0) return
    const selectedEmails = fromEmails.length === 1
      ? [fromEmails[0].email]
      : fromEmails.filter(e => checkedEmails[e.email] !== false).map(e => e.email)
    if (selectedEmails.length === 0) return
    setSending(true)
    setRemindResult(null)
    try {
      await onRemind(selectedEmails)
      setRemindResult('sent')
      setConfirmingRemind(false)
    } catch {
      setRemindResult('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <div className="p-3 space-y-2">
        {/* Row 1: Names */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">{index}.</span>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0">
              <ParticipantAvatar participant={{ name: transaction.fromName, avatar_url: avatarMap?.[transaction.fromId] ?? null }} size="sm" forceInitials={transaction.fromIsFamily} />
              <span className="font-medium text-foreground text-sm">
                {transaction.fromName}
              </span>
            </div>
            <span className="text-muted-foreground shrink-0">→</span>
            <div className="flex items-center gap-1 min-w-0">
              <ParticipantAvatar participant={{ name: transaction.toName, avatar_url: avatarMap?.[transaction.toId] ?? null }} size="sm" forceInitials={transaction.toIsFamily} />
              <span className="font-medium text-foreground text-sm">
                {transaction.toName}
              </span>
            </div>
          </div>
          {/* Amount + buttons inline on desktop */}
          <span className="text-base font-semibold text-accent tabular-nums shrink-0 ml-auto hidden md:inline">{formattedAmount}</span>
          <div className="hidden md:flex flex-col gap-1 shrink-0">
            {onSettle && (
              <Button onClick={onSettle} size="sm" className="h-7 text-xs">
                Settle
              </Button>
            )}
            {fromEmails && fromEmails.length > 0 && onRemind && !confirmingRemind && (
              <Button
                onClick={() => {
                  setConfirmingRemind(true)
                  setRemindResult(null)
                  if (fromEmails.length > 1) {
                    const init: Record<string, boolean> = {}
                    for (const e of fromEmails) init[e.email] = true
                    setCheckedEmails(init)
                  }
                }}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                title={`Send payment reminder to ${transaction.fromName}`}
              >
                <Bell size={12} className="mr-1" />
                Remind
              </Button>
            )}
            {confirmingRemind && (
              <Button
                onClick={() => setConfirmingRemind(false)}
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
        {/* Row 2: Amount + buttons on mobile */}
        <div className="flex items-center justify-between pl-5 md:hidden">
          <span className="text-base font-semibold text-accent tabular-nums">{formattedAmount}</span>
          <div className="flex gap-1.5">
            {onSettle && (
              <Button onClick={onSettle} size="sm" className="h-7 text-xs">
                Settle
              </Button>
            )}
            {fromEmails && fromEmails.length > 0 && onRemind && !confirmingRemind && (
              <Button
                onClick={() => {
                  setConfirmingRemind(true)
                  setRemindResult(null)
                  if (fromEmails.length > 1) {
                    const init: Record<string, boolean> = {}
                    for (const e of fromEmails) init[e.email] = true
                    setCheckedEmails(init)
                  }
                }}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                title={`Send payment reminder to ${transaction.fromName}`}
              >
                <Bell size={12} className="mr-1" />
                Remind
              </Button>
            )}
            {confirmingRemind && (
              <Button
                onClick={() => setConfirmingRemind(false)}
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Bank Details */}
        {bankDetails && (bankDetails.iban || bankDetails.holder) && (
          <div className="text-xs text-muted-foreground pl-5 space-y-0.5">
            {bankDetails.holder && <p>Account: {bankDetails.holder}</p>}
            {bankDetails.iban && <p>IBAN: {bankDetails.iban}</p>}
          </div>
        )}
        {!bankDetails && linkedParticipantIds?.has(transaction.toId) && (
          <p className="text-xs text-muted-foreground italic pl-5">
            Ask {transaction.toName} to add their bank details
          </p>
        )}

        {/* Remind confirmation inline */}
        {confirmingRemind && fromEmails && fromEmails.length > 0 && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-2 ml-5">
            <p className="text-sm text-foreground">
              Send payment reminder to <strong>{transaction.fromName}</strong>?
            </p>
            {fromEmails.length === 1 ? (
              <p className="text-xs text-muted-foreground">{fromEmails[0].email}</p>
            ) : (
              <div className="space-y-1.5">
                {fromEmails.map(({ name, email }) => (
                  <label key={email} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedEmails[email] !== false}
                      onChange={(e) => setCheckedEmails(prev => ({ ...prev, [email]: e.target.checked }))}
                      className="accent-primary"
                    />
                    <span>{name} — {email}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSendReminder}
                disabled={sending || (fromEmails.length > 1 && fromEmails.every(e => checkedEmails[e.email] === false))}
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setConfirmingRemind(false); setRemindResult(null) }}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Remind result feedback */}
        {remindResult === 'sent' && (
          <p className="text-xs text-positive flex items-center gap-1 pl-5">
            <Check size={12} />
            Reminder sent to {transaction.fromName}
          </p>
        )}
        {remindResult === 'error' && (
          <p className="text-xs text-destructive pl-5">
            Failed to send reminder. Please try again.
          </p>
        )}
      </div>
    </Card>
  )
}
