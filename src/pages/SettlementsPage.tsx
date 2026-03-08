// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { Receipt, FileDown, X, Trash2 } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { calculateBalances, buildEntityMap } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import { exportSettlementPlanToPDF } from '@/services/pdfExport'
import type { SettlementTransaction } from '@/services/settlementOptimizer'
import type { CreateSettlementInput } from '@/types/settlement'
import { SettlementPlan, BankDetails } from '@/components/SettlementPlan'
import { SettlementForm, SettlementFormHandle } from '@/components/SettlementForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export function SettlementsPage() {
  const { currentTrip } = useCurrentTrip()
  const { user, userProfile } = useAuth()
  const { participants, loading: pLoading, error: pError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: eLoading, error: eError, refreshExpenses } = useExpenseContext()
  const { createSettlement, deleteSettlement, settlements, loading: sLoading, error: sError, refreshSettlements } = useSettlementContext()
  const { receiptByExpenseId } = useReceiptContext()
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [prefill, setPrefill] = useState<{
    amount?: number
    note?: string
    fromId?: string
    toId?: string
    bankDetails?: BankDetails | null
    recipientName?: string
  } | null>(null)
  const [bankDetailsMap, setBankDetailsMap] = useState<Record<string, BankDetails>>({})
  const [linkedParticipantIds, setLinkedParticipantIds] = useState<Set<string>>(new Set())
  const [retrying, setRetrying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const formRef = useRef<SettlementFormHandle>(null)
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()

  const handleRefresh = useCallback(
    () => Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()]).then(() => {}),
    [refreshParticipants, refreshExpenses, refreshSettlements]
  )
  useRegisterRefresh(handleRefresh)

  const loading = pLoading || eLoading || sLoading
  const contextError = pError || eError || sError

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()])
    } finally {
      setRetrying(false)
    }
  }

  // Build a map of entity ID → avatar_url for settlement plan avatars
  const avatarMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const p of participants) {
      map[p.id] = p.avatar_url ?? null
    }
    return map
  }, [participants])

  // Build a map of entity ID → emails for the "from" side of transactions
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

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Settlements</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to view settlements.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate balances (including settlements, with currency conversion)
  const balanceCalculation = useMemo(() => calculateBalances(
    expenses,
    participants,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  ), [expenses, participants, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates])

  // Calculate optimal and greedy settlement plans
  const optimalSettlement = useMemo(() => calculateOptimalSettlement(
    balanceCalculation.balances,
    currentTrip.default_currency,
    'optimal'
  ), [balanceCalculation.balances, currentTrip.default_currency])

  const greedySettlement = useMemo(() => calculateOptimalSettlement(
    balanceCalculation.balances,
    currentTrip.default_currency,
    'greedy'
  ), [balanceCalculation.balances, currentTrip.default_currency])

  // Stable string key for recipient IDs to avoid infinite re-fetch
  const recipientKey = useMemo(
    () => optimalSettlement.transactions.map(t => t.toId).join(','),
    [optimalSettlement.transactions]
  )

  // Fetch bank details for settlement recipients (only for signed-in users)
  useEffect(() => {
    if (!user || !currentTrip) return

    const fetchBankDetails = async () => {
      // Collect recipient entity IDs from the settlement plan
      const recipientIds = optimalSettlement.transactions.map(t => t.toId)
      if (recipientIds.length === 0) return

      // Use entity map to match participant IDs to entity IDs
      const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)

      // Find participants whose entity ID matches a recipient
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
          const matchingParticipants = recipientParticipants.filter(p => p.user_id === profile.id)
          for (const p of matchingParticipants) {
            const entityId = entityMap.participantToEntityId.get(p.id) ?? p.id
            map[entityId] = {
              holder: profile.bank_account_holder || '',
              iban: profile.bank_iban || '',
            }
          }
        }
      }

      setBankDetailsMap(map)
    }

    fetchBankDetails()
  }, [user, recipientKey, participants, currentTrip])

  const handleRecordSettlement = (transaction: SettlementTransaction) => {
    setPrefill({
      amount: transaction.amount,
      fromId: transaction.fromId,
      toId: transaction.toId,
      bankDetails: bankDetailsMap[transaction.toId] || null,
      recipientName: transaction.toName,
    })
    setShowRecordDialog(true)
  }

  const closeDialog = () => {
    setShowRecordDialog(false)
    setPrefill(null)
  }

  const handleCustomSettlement = async (input: CreateSettlementInput) => {
    setSubmitting(true)
    try {
      const result = await createSettlement(input)
      if (!result) {
        throw new Error('Failed to record settlement')
      }
      closeDialog()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSettlement = async () => {
    if (!deletingId) return
    await deleteSettlement(deletingId)
    setDeletingId(null)
  }

  const handleRemind = async (transaction: SettlementTransaction, emails: string[]): Promise<void> => {
    if (!currentTrip || !user) return
    const organiserName = userProfile?.display_name || user.email?.split('@')[0] || 'Organiser'

    // Collect structured receipt data for expenses paid by the creditor (toId)
    // Entity IDs may represent wallet_groups — expand to all participant IDs in the group
    const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
    const creditorParticipantIds = new Set(
      participants
        .filter(p => (entityMap.participantToEntityId.get(p.id) ?? p.id) === transaction.toId)
        .map(p => p.id)
    )
    const debtorParticipantIds = participants
      .filter(p => (entityMap.participantToEntityId.get(p.id) ?? p.id) === transaction.fromId)
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
      emails.map(email =>
        supabase.functions.invoke('send-email', {
          body: {
            type: 'payment_reminder',
            trip_id: currentTrip.id,
            trip_name: currentTrip.name,
            trip_code: currentTrip.trip_code,
            recipient_name: transaction.fromName,
            recipient_email: email,
            amount: transaction.amount,
            currency: currentTrip.default_currency,
            pay_to_name: transaction.toName,
            organiser_name: organiserName,
            ...(receipts.length > 0 && { receipts }),
            ...(creditorExpenseCount > 3 && { expense_count: creditorExpenseCount }),
          },
        })
      )
    )

    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    if (failures.length > 0) {
      logger.error('Failed to send payment reminder(s)', { failureCount: failures.length, totalCount: emails.length })
      if (failures.length === emails.length) {
        throw new Error('Failed to send reminder')
      }
    }
  }

  const handleExportPDF = () => {
    exportSettlementPlanToPDF(currentTrip, optimalSettlement, balanceCalculation.balances)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Settlements</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Optimal settlement plan and payment recording for {currentTrip.name}
            </p>
          </div>
          {expenses.length > 0 && (
            <Button onClick={handleExportPDF} variant="ghost" size="icon" title="Export PDF">
              <FileDown size={18} />
            </Button>
          )}
        </div>

        {loading ? (
          <PageLoadingState />
        ) : contextError ? (
          <PageErrorState error={contextError} onRetry={handleRetry} retrying={retrying} />
        ) : <>
        {/* Settlement Summary Stats — compact on mobile */}
        <Card className="md:hidden">
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              <div>
                <div className="text-base font-bold tabular-nums">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currentTrip.default_currency,
                  }).format(
                    balanceCalculation.balances
                      .filter(b => b.balance < 0)
                      .reduce((sum, b) => sum + Math.abs(b.balance), 0)
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">to settle</div>
              </div>
              <div>
                <div className="text-base font-bold tabular-nums">{optimalSettlement.totalTransactions}</div>
                <div className="text-[10px] text-muted-foreground">
                  {optimalSettlement.totalTransactions === 0 ? 'all settled!' : 'needed'}
                </div>
              </div>
              <div>
                <div className="text-base font-bold tabular-nums">{settlements.length}</div>
                <div className="text-[10px] text-muted-foreground">recorded</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Summary Stats — full cards on desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total to Settle</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currentTrip.default_currency,
                }).format(
                  balanceCalculation.balances
                    .filter(b => b.balance < 0)
                    .reduce((sum, b) => sum + Math.abs(b.balance), 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total amount owed by all debtors
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Settlements Needed</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {optimalSettlement.totalTransactions}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {optimalSettlement.totalTransactions === 0 ? 'All settled!' : 'transactions required'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Settlements Recorded</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {settlements.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total payments recorded
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optimal Settlement Plan */}
        {expenses.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <SettlementPlan
                plan={optimalSettlement}
                greedyPlan={greedySettlement.totalTransactions !== optimalSettlement.totalTransactions ? greedySettlement : undefined}
                onSettle={handleRecordSettlement}
                bankDetailsMap={bankDetailsMap}
                linkedParticipantIds={linkedParticipantIds}
                fromEmailMap={fromEmailMap}
                onRemind={user ? handleRemind : undefined}
                avatarMap={avatarMap}
              />
            </CardContent>
          </Card>
        )}

        {/* Record a payment button */}
        {participants.length > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={() => { setPrefill(null); setShowRecordDialog(true) }}
              variant="outline"
              size="sm"
            >
              Log a custom payment
            </Button>
          </div>
        )}

        {/* Settlement History */}
        {settlements.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Settlement History
              </h3>
              <div className="space-y-2">
                {settlements.map((settlement) => {
                  const fromParticipant = participants.find(p => p.id === settlement.from_participant_id)
                  const toParticipant = participants.find(p => p.id === settlement.to_participant_id)

                  return (
                    <div
                      key={settlement.id}
                      className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-foreground">
                            {fromParticipant?.name || 'Unknown'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium text-foreground">
                            {toParticipant?.name || 'Unknown'}
                          </span>
                        </div>
                        {settlement.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {settlement.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-positive tabular-nums">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: settlement.currency,
                          }).format(settlement.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(settlement.settlement_date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeletingId(settlement.id)}
                        aria-label="Delete settlement"
                        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {expenses.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No expenses recorded yet. Add expenses first to see settlement recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </>}
      </div>

      {/* Record Settlement — Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={showRecordDialog} onOpenChange={(open) => { if (!open) closeDialog() }}>
          <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{
            height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
            ...(keyboard.isVisible && {
              top: `${keyboard.viewportOffset}px`,
              bottom: 'auto',
            }),
            ...(keyboard.viewportOffset > 0 && {
              paddingBottom: `${keyboard.viewportOffset}px`,
            }),
          }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="w-8" />
              <SheetTitle className="text-base font-semibold">Settle Up</SheetTitle>
              <button onClick={closeDialog} aria-label="Close"
                className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Log a payment between participants.
              </p>
              <SettlementForm
                ref={formRef}
                onSubmit={handleCustomSettlement}
                initialAmount={prefill?.amount}
                initialNote={prefill?.note}
                initialFromId={prefill?.fromId}
                initialToId={prefill?.toId}
                recipientBankDetails={prefill?.bankDetails}
                recipientName={prefill?.recipientName}
                hideButtons
              />
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 flex gap-3 pwa-safe-bottom">
              <Button
                onClick={() => formRef.current?.submit()}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Confirming...' : 'Confirm Payment'}
              </Button>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showRecordDialog} onOpenChange={(open) => { if (!open) closeDialog() }}>
          <DialogContent hideClose className="max-w-lg max-h-[85vh] p-0 gap-0 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="w-8" />
              <DialogTitle className="text-base font-semibold">Settle Up</DialogTitle>
              <button onClick={closeDialog} aria-label="Close"
                className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Log a payment between participants.
              </p>
              <SettlementForm
                ref={formRef}
                hideButtons
                onSubmit={handleCustomSettlement}
                initialAmount={prefill?.amount}
                initialNote={prefill?.note}
                initialFromId={prefill?.fromId}
                initialToId={prefill?.toId}
                recipientBankDetails={prefill?.bankDetails}
                recipientName={prefill?.recipientName}
              />
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 flex gap-3">
              <Button
                onClick={() => formRef.current?.submit()}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Confirming...' : 'Confirm Payment'}
              </Button>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete settlement confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete settlement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the recorded payment. Balances will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSettlement} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
