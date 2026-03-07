import { useState, useRef, useMemo, useEffect } from 'react'
import { ArrowRight, ArrowLeft, PartyPopper, Bell, Check, X } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { calculateBalances, buildEntityMap } from '@/services/balanceCalculator'
import { calculateOptimalSettlement, SettlementTransaction } from '@/services/settlementOptimizer'
import { SettlementForm } from '@/components/SettlementForm'
import { CreateSettlementInput } from '@/types/settlement'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { BankDetailsDialog } from '@/components/auth/BankDetailsDialog'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface BankDetails { holder: string; iban: string }

interface QuickSettlementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Prefill {
  fromId: string
  toId: string
  amount: number
  note?: string
  bankDetails?: BankDetails | null
  toName?: string
}

export function QuickSettlementSheet({ open, onOpenChange }: QuickSettlementSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { expenses } = useExpenseContext()
  const { participants } = useParticipantContext()
  const { settlements, createSettlement } = useSettlementContext()
  const { receiptByExpenseId } = useReceiptContext()
  const { myParticipant } = useMyParticipant()
  const { toast } = useToast()
  const { user, userProfile } = useAuth()

  const scrollRef = useIOSScrollFix()
  const [view, setView] = useState<'suggestions' | 'form'>('suggestions')
  const [settlementMode, setSettlementMode] = useState<'optimal' | 'greedy'>('optimal')
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [bankDetailsMap, setBankDetailsMap] = useState<Record<string, BankDetails>>({})
  const [linkedParticipantIds, setLinkedParticipantIds] = useState<Set<string>>(new Set())
  const [confirmingRemindIdx, setConfirmingRemindIdx] = useState<number | null>(null)
  const [sendingRemind, setSendingRemind] = useState(false)
  const [remindResults, setRemindResults] = useState<Record<number, 'sent' | 'error'>>({})
  const [checkedEmails, setCheckedEmails] = useState<Record<string, boolean>>({})
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const isSubmittingRef = useRef(false)
  const keyboard = useKeyboardHeight()
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Build email map: entity ID → emails (multiple adults in wallet_group)
  const fromEmailMap = useMemo(() => {
    if (!currentTrip) return {}
    const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
    const map: Record<string, { name: string; email: string }[]> = {}
    for (const p of participants) {
      if (!p.email || p.is_adult === false) continue
      const entityId = entityMap.participantToEntityId.get(p.id) ?? p.id
      if (!map[entityId]) map[entityId] = []
      map[entityId].push({ name: p.name, email: p.email })
    }
    return map
  }, [participants, currentTrip])

  if (!currentTrip) return null

  const trackingMode = currentTrip.tracking_mode || 'individuals'
  const defaultCurrency = currentTrip.default_currency || 'EUR'
  const exchangeRates = currentTrip.exchange_rates || {}

  // Compute both optimal and greedy settlement plans
  const { myTransactions, myGreedyTransactions, allSettled, currency, showModeToggle } = useMemo(() => {
    const balanceCalc = calculateBalances(
      expenses,
      participants,
      trackingMode,
      settlements,
      defaultCurrency,
      exchangeRates,
    )
    const optimalPlan = calculateOptimalSettlement(balanceCalc.balances, defaultCurrency, 'optimal')
    const greedyPlan = calculateOptimalSettlement(balanceCalc.balances, defaultCurrency, 'greedy')

    if (!myParticipant) {
      return { myTransactions: [], myGreedyTransactions: [], allSettled: optimalPlan.transactions.length === 0, currency: optimalPlan.currency, showModeToggle: false }
    }

    // Determine which entity ID represents "me" via entity map
    const entityMap = buildEntityMap(participants, trackingMode)
    const myEntityId = entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id

    // Filter transactions involving me
    const myOptimal = optimalPlan.transactions.filter(
      t => t.fromId === myEntityId || t.toId === myEntityId,
    )
    const myGreedy = greedyPlan.transactions.filter(
      t => t.fromId === myEntityId || t.toId === myEntityId,
    )

    return {
      myTransactions: myOptimal,
      myGreedyTransactions: myGreedy,
      allSettled: optimalPlan.transactions.length === 0,
      currency: optimalPlan.currency,
      showModeToggle: myOptimal.length !== myGreedy.length,
    }
  }, [expenses, participants, settlements, trackingMode, defaultCurrency, exchangeRates, myParticipant])

  const activeTransactions = settlementMode === 'greedy' ? myGreedyTransactions : myTransactions

  const myEntityId = useMemo(() => {
    if (!myParticipant) return null
    const entityMap = buildEntityMap(participants, trackingMode)
    return entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id
  }, [myParticipant, participants, trackingMode])

  const recipientKey = useMemo(() => {
    if (!myEntityId) return ''
    // Include recipients from both modes so bank details are fetched for either
    const optimalRecipients = myTransactions.filter(t => t.fromId === myEntityId).map(t => t.toId)
    const greedyRecipients = myGreedyTransactions.filter(t => t.fromId === myEntityId).map(t => t.toId)
    return [...new Set([...optimalRecipients, ...greedyRecipients])].join(',')
  }, [myTransactions, myGreedyTransactions, myEntityId])

  useEffect(() => {
    if (!user || !recipientKey) return
    const recipientIds = recipientKey.split(',').filter(Boolean)
    if (recipientIds.length === 0) return

    const fetchBankDetails = async () => {
      const entityMap = buildEntityMap(participants, trackingMode)
      const recipientParticipants = participants.filter(p => {
        if (!p.user_id) return false
        const entityId = entityMap.participantToEntityId.get(p.id) ?? p.id
        return recipientIds.includes(entityId)
      })
      const linkedEntityIds = new Set<string>(
        recipientParticipants.map(p => entityMap.participantToEntityId.get(p.id) ?? p.id)
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
            const entityId = entityMap.participantToEntityId.get(p.id) ?? p.id
            map[entityId] = { holder: profile.bank_account_holder || '', iban: profile.bank_iban || '' }
          }
        }
      }
      setBankDetailsMap(map)
    }

    fetchBankDetails()
  }, [user, recipientKey, participants])

  const handleRemind = async (tx: SettlementTransaction, idx: number) => {
    if (!currentTrip || !user) return
    const fromEmails = fromEmailMap[tx.fromId]
    if (!fromEmails || fromEmails.length === 0) return

    // Determine which emails to send to
    const selectedEmails = fromEmails.length === 1
      ? [fromEmails[0].email]
      : fromEmails.filter(e => checkedEmails[e.email] !== false).map(e => e.email)
    if (selectedEmails.length === 0) return

    setSendingRemind(true)
    try {
      const organiserName = userProfile?.display_name || user.email?.split('@')[0] || 'Organiser'

      // Collect receipt data for expenses paid by the creditor
      const entityMap = buildEntityMap(participants, trackingMode)
      const creditorParticipantIds = new Set(
        participants
          .filter(p => (entityMap.participantToEntityId.get(p.id) ?? p.id) === tx.toId)
          .map(p => p.id)
      )
      const debtorParticipantIds = participants
        .filter(p => (entityMap.participantToEntityId.get(p.id) ?? p.id) === tx.fromId)
        .map(p => p.id)

      // Count all expenses paid by the creditor to decide receipt vs summary
      const creditorExpenseCount = expenses.filter(e => creditorParticipantIds.has(e.paid_by)).length

      const receipts: Array<{
        merchant: string | null
        items: Array<{ name: string; price: number; qty: number }> | null
        confirmed_total: number | null
        tip_amount: number
        currency: string | null
        mapped_items: Array<{ item_index: number; participant_ids: string[] }> | null
        debtor_participant_ids: string[]
      }> = []

      // Only collect receipt details when creditor has 3 or fewer expenses
      if (creditorExpenseCount <= 3) {
        for (const expense of expenses) {
          if (!creditorParticipantIds.has(expense.paid_by)) continue
          const receipt = receiptByExpenseId[expense.id]
          if (receipt) {
            receipts.push({
              merchant: receipt.extracted_merchant,
              items: receipt.extracted_items,
              confirmed_total: receipt.confirmed_total,
              tip_amount: receipt.tip_amount,
              currency: receipt.extracted_currency ?? currentTrip.default_currency,
              mapped_items: receipt.mapped_items,
              debtor_participant_ids: debtorParticipantIds,
            })
          }
        }
      }

      // Send one email per selected recipient
      const results = await Promise.allSettled(
        selectedEmails.map(email =>
          supabase.functions.invoke('send-email', {
            body: {
              type: 'payment_reminder',
              trip_id: currentTrip.id,
              trip_name: currentTrip.name,
              trip_code: currentTrip.trip_code,
              recipient_name: tx.fromName,
              recipient_email: email,
              amount: tx.amount,
              currency: currentTrip.default_currency,
              pay_to_name: tx.toName,
              organiser_name: organiserName,
              ...(receipts.length > 0 && { receipts }),
              ...(creditorExpenseCount > 3 && { expense_count: creditorExpenseCount }),
            },
          })
        )
      )

      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
      if (failures.length === selectedEmails.length) throw new Error('All reminders failed')

      setRemindResults(prev => ({ ...prev, [idx]: 'sent' }))
      setConfirmingRemindIdx(null)
    } catch (err) {
      logger.error('QuickSettlementSheet: failed to send reminder', { error: String(err) })
      setRemindResults(prev => ({ ...prev, [idx]: 'error' }))
    } finally {
      setSendingRemind(false)
    }
  }

  const handleRecord = (tx: SettlementTransaction) => {
    // Entity IDs are already participant IDs (canonical adult in wallet_group)
    setPrefill({
      fromId: tx.fromId,
      toId: tx.toId,
      amount: tx.amount,
      note: `Settlement: ${tx.fromName} → ${tx.toName}`,
      bankDetails: bankDetailsMap[tx.toId] || null,
      toName: tx.toName,
    })
    setView('form')
  }

  const handleRecordDifferent = () => {
    setPrefill(null)
    setView('form')
  }

  const handleSubmit = async (input: CreateSettlementInput) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    try {
      await createSettlement(input)
      toast({
        title: 'Payment recorded',
        description: `${input.currency} ${input.amount.toFixed(2)} payment logged`,
      })
      setView('suggestions')
      setPrefill(null)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('QuickSettlementSheet: failed to record payment', { error: message })
      toast({
        variant: 'destructive',
        title: 'Failed to record payment',
        description: message,
      })
      throw err
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setView('suggestions')
      setSettlementMode('optimal')
      setPrefill(null)
      setConfirmingRemindIdx(null)
      setRemindResults({})
      setCheckedEmails({})
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

  const leftSlot = view === 'form' ? (
    <button
      onClick={() => setView('suggestions')}
      aria-label="Go back"
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
    </button>
  ) : (
    <div className="w-8" />
  )

  const closeBtn = (
    <button
      onClick={() => handleOpenChange(false)}
      aria-label="Close"
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      <X className="w-4 h-4 text-muted-foreground" />
    </button>
  )

  const titleText = view === 'suggestions' ? 'Settle up' : 'Record payment'

  const scrollContent = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
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
          ) : activeTransactions.length === 0 ? (
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Suggested payments to settle up:
                </p>
                {showModeToggle && (
                  <div className="flex rounded-full border border-border bg-muted/50 p-0.5 text-xs shrink-0">
                    <button
                      onClick={() => setSettlementMode('optimal')}
                      className={`px-2.5 py-1 rounded-full transition-colors ${
                        settlementMode === 'optimal'
                          ? 'bg-accent text-white font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fewer
                    </button>
                    <button
                      onClick={() => setSettlementMode('greedy')}
                      className={`px-2.5 py-1 rounded-full transition-colors ${
                        settlementMode === 'greedy'
                          ? 'bg-accent text-white font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Standard
                    </button>
                  </div>
                )}
              </div>
              {activeTransactions.map((tx, i) => {
                const iOwe = tx.fromId === myEntityId
                const fromEmails = !iOwe ? fromEmailMap[tx.fromId] : undefined
                const canRemind = !iOwe && !!fromEmails && fromEmails.length > 0
                const isConfirmingRemind = confirmingRemindIdx === i
                const remindResult = remindResults[i]
                return (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 flex items-start justify-between gap-3"
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
                        return (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Ask {tx.toName} to join Spl1t to share payment details
                          </p>
                        )
                      })()}
                      {!iOwe && (() => {
                        const myBank = userProfile?.bank_account_holder || userProfile?.bank_iban
                        if (myBank) {
                          return (
                            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                              <p className="font-medium text-foreground/70">Your payment details:</p>
                              {userProfile?.bank_account_holder && <p>Account: {userProfile.bank_account_holder}</p>}
                              {userProfile?.bank_iban && <p className="font-mono">{userProfile.bank_iban}</p>}
                            </div>
                          )
                        }
                        return (
                          <button
                            onClick={() => setBankDialogOpen(true)}
                            className="mt-2 text-xs text-primary hover:underline"
                          >
                            Add your bank details so others can pay you →
                          </button>
                        )
                      })()}

                      {/* Inline remind confirm */}
                      {isConfirmingRemind && fromEmails && fromEmails.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
                          <p className="text-sm text-foreground">
                            Send payment reminder to <strong>{tx.fromName}</strong>?
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
                              onClick={() => handleRemind(tx, i)}
                              disabled={sendingRemind || (fromEmails.length > 1 && fromEmails.every(e => checkedEmails[e.email] === false))}
                            >
                              {sendingRemind ? 'Sending…' : 'Send'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setConfirmingRemindIdx(null) }}
                              disabled={sendingRemind}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {remindResult === 'sent' && (
                        <p className="mt-2 text-xs text-positive flex items-center gap-1">
                          <Check size={12} />
                          Reminder sent to {tx.fromName}
                        </p>
                      )}
                      {remindResult === 'error' && (
                        <p className="mt-2 text-xs text-destructive">
                          Failed to send reminder. Please try again.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRecord(tx)}
                      >
                        Settle
                      </Button>
                      {canRemind && !isConfirmingRemind && remindResult !== 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setConfirmingRemindIdx(i)
                            setRemindResults(prev => { const n = { ...prev }; delete n[i]; return n })
                            // Initialize all emails as checked
                            if (fromEmails && fromEmails.length > 1) {
                              const init: Record<string, boolean> = {}
                              for (const e of fromEmails) init[e.email] = true
                              setCheckedEmails(init)
                            }
                          }}
                          title={`Send payment reminder to ${tx.fromName}`}
                        >
                          <Bell size={14} className="mr-1" />
                          Remind
                        </Button>
                      )}
                      {isConfirmingRemind && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => setConfirmingRemindIdx(null)}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
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
              Record a custom payment
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
          initialNote={prefill?.note}
          recipientBankDetails={prefill?.bankDetails}
          recipientName={prefill?.toName}
        />
      )}
    </div>
  )

  const bankDialog = <BankDetailsDialog open={bankDialogOpen} onOpenChange={setBankDialogOpen} />

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            hideClose
            className="flex flex-col p-0 rounded-t-2xl"
            style={{
              height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
              bottom: keyboard.isVisible
                ? `${Math.max(0, keyboard.keyboardHeight - keyboard.viewportOffset)}px`
                : undefined,
              paddingBottom: keyboard.isVisible && keyboard.viewportOffset > 0
                ? `${keyboard.viewportOffset}px`
                : undefined,
            }}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
              {leftSlot}
              <SheetTitle className="text-base font-semibold">{titleText}</SheetTitle>
              {closeBtn}
            </div>
            {scrollContent}
          </SheetContent>
        </Sheet>
        {bankDialog}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent hideClose className="flex flex-col max-h-[85vh] p-0 gap-0">
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            {leftSlot}
            <DialogTitle className="text-base font-semibold">{titleText}</DialogTitle>
            {closeBtn}
          </div>
          {scrollContent}
        </DialogContent>
      </Dialog>
      {bankDialog}
    </>
  )
}
