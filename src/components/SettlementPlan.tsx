import { PartyPopper, Lightbulb, Check } from 'lucide-react'
import { OptimalSettlementPlan, SettlementTransaction } from '@/services/settlementOptimizer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export interface BankDetails {
  holder: string
  iban: string
}

interface SettlementPlanProps {
  plan: OptimalSettlementPlan
  onRecordSettlement?: (transaction: SettlementTransaction) => void
  bankDetailsMap?: Record<string, BankDetails>
  linkedParticipantIds?: Set<string>
}

export function SettlementPlan({ plan, onRecordSettlement, bankDetailsMap, linkedParticipantIds }: SettlementPlanProps) {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Settlement Plan
        </h3>
        <span className="text-sm text-muted-foreground">
          {plan.totalTransactions} {plan.totalTransactions === 1 ? 'transaction' : 'transactions'}
        </span>
      </div>

      {/* Info Box */}
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Lightbulb size={16} className="text-accent mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">
          This is the optimal settlement plan with the minimum number of transactions needed to settle all balances.
        </p>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {plan.transactions.map((transaction, index) => (
          <SettlementTransactionCard
            key={index}
            transaction={transaction}
            currency={plan.currency}
            index={index + 1}
            onRecord={onRecordSettlement ? () => onRecordSettlement(transaction) : undefined}
            bankDetails={bankDetailsMap?.[transaction.toId]}
            linkedParticipantIds={linkedParticipantIds}
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
  onRecord?: () => void
  bankDetails?: BankDetails
  linkedParticipantIds?: Set<string>
}

function SettlementTransactionCard({
  transaction,
  currency,
  index,
  onRecord,
  bankDetails,
  linkedParticipantIds,
}: SettlementTransactionCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(transaction.amount)

  return (
    <Card>
      <div className="p-4 flex items-start justify-between">
        <div className="flex-1">
          {/* Step Number */}
          <div className="flex items-center mb-2">
            <span className="flex items-center justify-center w-6 h-6 bg-accent text-accent-foreground text-xs font-bold rounded-full mr-2">
              {index}
            </span>
            <span className="text-xs text-muted-foreground">Step {index}</span>
          </div>

          {/* Transaction Details */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">
                {transaction.fromName}
              </span>
              {transaction.isFromFamily && (
                <Badge variant="soft">Family</Badge>
              )}
            </div>

            <span className="text-muted-foreground">→</span>

            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">
                {transaction.toName}
              </span>
              {transaction.isToFamily && (
                <Badge variant="soft">Family</Badge>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-2">
            <span className="text-2xl font-bold text-accent tabular-nums">{formattedAmount}</span>
          </div>

          {/* Bank Details */}
          {bankDetails && (bankDetails.iban || bankDetails.holder) && (
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {bankDetails.holder && <p>Account: {bankDetails.holder}</p>}
              {bankDetails.iban && <p>IBAN: {bankDetails.iban}</p>}
            </div>
          )}
          {!bankDetails && linkedParticipantIds?.has(transaction.toId) && (
            <p className="mt-2 text-xs text-muted-foreground italic">
              Ask {transaction.toName} to add their bank details
            </p>
          )}
        </div>

        {/* Record Button */}
        {onRecord && (
          <Button
            onClick={onRecord}
            size="sm"
            className="ml-4"
          >
            <Check size={14} className="mr-1" />
            Record
          </Button>
        )}
      </div>
    </Card>
  )
}
