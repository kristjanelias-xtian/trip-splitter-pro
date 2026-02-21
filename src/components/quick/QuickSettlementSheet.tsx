import { useState, useMemo, useEffect } from 'react'
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
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface BankDetails { holder: string; iban: string }

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
  const { user } = useAuth()

  const [view, setView] = useState<'suggestions' | 'form'>('suggestions')
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [bankDetailsMap, setBankDetailsMap] = useState<Record<string, BankDetails>>({})
  const [linkedParticipantIds, setLinkedParticipantIds] = useState<Set<string>>(new Set())

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

  const myEntityId = myParticipant
    ? (trackingMode === 'families' && myParticipant.family_id
        ? myParticipant.family_id
        : myParticipant.id)
    : null

  const recipientKey = useMemo(() => {
    if (!myEntityId) return ''
    return myTransactions
      .filter(t => t.fromId === myEntityId)
      .map(t => t.toId)
      .join(',')
  }, [myTransactions, myEntityId])

  useEffect(() => {
    if (!user || !recipientKey) return
    const recipientIds = recipientKey.split(',').filter(Boolean)
    if (recipientIds.length === 0) return

    const fetchBankDetails = async () => {
      const recipientParticipants = participants.filter(p =>
        p.user_id &&
        (recipientIds.includes(p.id) || (p.family_id != null && recipientIds.includes(p.family_id)))
      )
      const linkedEntityIds = new Set<string>(
        recipientParticipants.map(p =>
          p.family_id && recipientIds.includes(p.family_id) ? p.family_id : p.id
        )
      )
      setLinkedParticipantIds(linkedEntityIds)
      if (recipientParticipants.length === 0) return

      const userIds = recipientParticipants.map(p => p.user_id!).filter(Boolean)
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('id, bank_account_holder, bank_iban')
        .in('id', userIds)
      if (error || !data) return

      const map: Record<string, BankDetails> = {}
      for (const profile of data) {
        if (profile.bank_account_holder || profile.bank_iban) {
          const matching = recipientParticipants.filter(p => p.user_id === profile.id)
          for (const p of matching) {
            const entityId = p.family_id && recipientIds.includes(p.family_id) ? p.family_id : p.id
            map[entityId] = { holder: profile.bank_account_holder || '', iban: profile.bank_iban || '' }
          }
        }
      }
      setBankDetailsMap(map)
    }

    fetchBankDetails()
  }, [user, recipientKey, participants])

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
    await createSettlement(input)
    toast({
      title: 'Payment recorded',
      description: `${input.currency} ${input.amount.toFixed(2)} payment logged`,
    })
    setView('suggestions')
    setPrefill(null)
    onOpenChange(false)
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
                        {iOwe && (() => {
                          const bankDetails = bankDetailsMap[tx.toId]
                          const isLinked = linkedParticipantIds.has(tx.toId)
                          if (bankDetails && (bankDetails.iban || bankDetails.holder)) {
                            return (
                              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                {bankDetails.holder && <p>Account: {bankDetails.holder}</p>}
                                {bankDetails.iban && <p className="font-mono">{bankDetails.iban}</p>}
                              </div>
                            )
                          }
                          if (isLinked) {
                            return (
                              <p className="mt-2 text-xs text-muted-foreground italic">
                                Ask {tx.toName} to add their bank details
                              </p>
                            )
                          }
                          return null
                        })()}
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
