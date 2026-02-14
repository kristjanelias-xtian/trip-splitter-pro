import { useState, useMemo } from 'react'
import { ArrowRight, ArrowLeft, PartyPopper } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { calculateBalances } from '@/services/balanceCalculator'
import { calculateOptimalSettlement, SettlementTransaction } from '@/services/settlementOptimizer'
import { SettlementForm } from '@/components/SettlementForm'
import { CreateSettlementInput } from '@/types/settlement'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface QuickSettlementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Prefill {
  fromId: string
  toId: string
  amount: number
}

export function QuickSettlementSheet({ open, onOpenChange }: QuickSettlementSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { expenses } = useExpenseContext()
  const { participants, families } = useParticipantContext()
  const { settlements, createSettlement } = useSettlementContext()
  const { myParticipant } = useMyParticipant()
  const { toast } = useToast()

  const [view, setView] = useState<'suggestions' | 'form'>('suggestions')
  const [prefill, setPrefill] = useState<Prefill | null>(null)

  if (!currentTrip) return null

  const trackingMode = currentTrip.tracking_mode || 'individuals'
  const defaultCurrency = currentTrip.default_currency || 'EUR'
  const exchangeRates = currentTrip.exchange_rates || {}

  // Compute optimal settlement plan
  const { myTransactions, allSettled, currency } = useMemo(() => {
    const balanceCalc = calculateBalances(
      expenses,
      participants,
      families,
      trackingMode,
      settlements,
      defaultCurrency,
      exchangeRates,
    )
    const plan = calculateOptimalSettlement(balanceCalc.balances, defaultCurrency)

    if (!myParticipant) {
      return { myTransactions: [], allSettled: plan.transactions.length === 0, currency: plan.currency }
    }

    // Determine which entity ID represents "me" in the optimizer
    // In families mode, the optimizer uses family IDs
    const myEntityId = trackingMode === 'families' && myParticipant.family_id
      ? myParticipant.family_id
      : myParticipant.id

    // Filter transactions involving me
    const mine = plan.transactions.filter(
      t => t.fromId === myEntityId || t.toId === myEntityId,
    )

    return {
      myTransactions: mine,
      allSettled: plan.transactions.length === 0,
      currency: plan.currency,
    }
  }, [expenses, participants, families, settlements, trackingMode, defaultCurrency, exchangeRates, myParticipant])

  // Map optimizer entity ID to an adult participant ID for the settlement form
  const resolveParticipantId = (entityId: string, isFamily: boolean): string => {
    if (!isFamily) return entityId
    // In families mode, find the first adult in that family
    const adult = participants.find(p => p.family_id === entityId && p.is_adult)
    return adult?.id || entityId
  }

  const handleRecord = (tx: SettlementTransaction) => {
    setPrefill({
      fromId: resolveParticipantId(tx.fromId, tx.isFromFamily),
      toId: resolveParticipantId(tx.toId, tx.isToFamily),
      amount: tx.amount,
    })
    setView('form')
  }

  const handleRecordDifferent = () => {
    setPrefill(null)
    setView('form')
  }

  const handleSubmit = async (input: CreateSettlementInput) => {
    const result = await createSettlement(input)
    if (result) {
      toast({
        title: 'Payment recorded',
        description: `${input.currency} ${input.amount.toFixed(2)} payment logged`,
      })
      // Reset to suggestions view for next time
      setView('suggestions')
      setPrefill(null)
      onOpenChange(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setView('suggestions')
      setPrefill(null)
    }
    onOpenChange(isOpen)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  }

  // Determine if a transaction is "you owe" or "owed to you"
  const myEntityId = myParticipant
    ? (trackingMode === 'families' && myParticipant.family_id
        ? myParticipant.family_id
        : myParticipant.id)
    : null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {view === 'suggestions' ? 'Log a payment' : (
              <button
                onClick={() => setView('suggestions')}
                className="flex items-center gap-1.5 text-base font-semibold hover:text-primary transition-colors"
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
          </SheetTitle>
        </SheetHeader>

        {view === 'suggestions' ? (
          <div className="space-y-4">
            {allSettled ? (
              <div className="bg-positive/10 border border-positive/30 rounded-lg p-6 text-center">
                <PartyPopper size={48} className="mx-auto text-positive mb-2" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  All Settled!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Everyone is squared up. No payments needed.
                </p>
              </div>
            ) : !myParticipant ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Link yourself to a participant to see suggested payments.
                </p>
              </div>
            ) : myTransactions.length === 0 ? (
              <div className="bg-positive/10 border border-positive/30 rounded-lg p-6 text-center">
                <PartyPopper size={48} className="mx-auto text-positive mb-2" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  You're all settled!
                </h3>
                <p className="text-sm text-muted-foreground">
                  You have no pending payments.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Suggested payments to settle up:
                </p>
                {myTransactions.map((tx, i) => {
                  const iOwe = tx.fromId === myEntityId
                  return (
                    <div
                      key={i}
                      className="border border-border rounded-lg p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate">
                            {iOwe ? 'You' : tx.fromName}
                          </span>
                          <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {iOwe ? tx.toName : 'You'}
                          </span>
                        </div>
                        <p className={`text-lg font-bold tabular-nums mt-0.5 ${iOwe ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {formatAmount(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {iOwe ? 'You owe' : 'Owed to you'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRecord(tx)}
                      >
                        Record
                      </Button>
                    </div>
                  )
                })}
              </>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRecordDifferent}
              >
                Record a different payment
              </Button>
            </div>
          </div>
        ) : (
          <SettlementForm
            onSubmit={handleSubmit}
            onCancel={() => setView('suggestions')}
            initialFromId={prefill?.fromId}
            initialToId={prefill?.toId}
            initialAmount={prefill?.amount}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
