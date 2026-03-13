// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { Receipt, FileDown, Trash2, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
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
  const formRef = useRef<SettlementFormHandle>(null)

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

  // Build maps of entity ID → emails for "from" and "to" sides of transactions
  const { fromEmailMap, toEmailMap } = useMemo(() => {
    if (!currentTrip) return { fromEmailMap: {}, toEmailMap: {} }
    const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
    const map: Record<string, { name: string; email: string }[]> = {}
    for (const p of participants) {
      if (!p.email || p.is_adult === false) continue
      const entityId = entityMap.participantToEntityId.get(p.id) ?? p.id
      if (!map[entityId]) map[entityId] = []
      map[entityId].push({ name: p.name, email: p.email })
    }
    // Both from and to use the same underlying map — all participants with emails
    return { fromEmailMap: map, toEmailMap: map }
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

  // Remind All state
  const { toast } = useToast()
  const [remindAllOpen, setRemindAllOpen] = useState(false)
  const [remindAllSending, setRemindAllSending] = useState(false)
  // Deduplicate remindable transactions by debtor entity ID
  const remindableDebtors = useMemo(() => {
    const map = new Map<string, {
      name: string
      emails: string[]
      payments: Array<{ amount: number; toName: string }>
    }>()
    for (const t of optimalSettlement.transactions) {
      const emails = fromEmailMap[t.fromId]
      if (!emails || emails.length === 0) continue
      const existing = map.get(t.fromId)
      if (existing) {
        existing.payments.push({ amount: t.amount, toName: t.toName })
      } else {
        map.set(t.fromId, {
          name: t.fromName,
          emails: emails.map(e => e.email),
          payments: [{ amount: t.amount, toName: t.toName }],
        })
      }
    }
    return map
  }, [optimalSettlement.transactions, fromEmailMap])

  const canRemindAll = !!user
    && currentTrip.enable_settlement_reminders !== false
    && remindableDebtors.size > 0

  const unreachableCount = optimalSettlement.transactions.length
    - Array.from(remindableDebtors.values()).reduce((sum, d) => sum + d.payments.length, 0)

  const handleRemindAll = async () => {
    if (!currentTrip || !user) return
    setRemindAllSending(true)
    const organiserName = userProfile?.display_name || user.email?.split('@')[0] || 'Organiser'
    try {
      const entries = Array.from(remindableDebtors.entries())
      const results = await Promise.allSettled(
        entries.map(([, debtor]) =>
          Promise.allSettled(
            debtor.emails.map(email =>
              supabase.functions.invoke('send-email', {
                body: {
                  type: 'payment_reminder',
                  trip_id: currentTrip.id,
                  trip_name: currentTrip.name,
                  trip_code: currentTrip.trip_code,
                  recipient_name: debtor.name,
                  recipient_email: email,
                  currency: currentTrip.default_currency,
                  payments: debtor.payments.map(p => ({
                    amount: p.amount,
                    pay_to_name: p.toName,
                  })),
                  organiser_name: organiserName,
                },
              })
            )
          )
        )
      )
      const failures = results.filter(r => r.status === 'rejected')
      const debtorCount = remindableDebtors.size
      if (failures.length === 0) {
        toast({ title: 'Reminders sent', description: `Sent to ${debtorCount} ${debtorCount === 1 ? 'person' : 'people'}.` })
      } else {
        toast({ variant: 'destructive', title: 'Some reminders failed', description: `${failures.length} of ${debtorCount} failed to send.` })
      }
    } finally {
      setRemindAllSending(false)
      setRemindAllOpen(false)
    }
  }

  const handleNudgeBankDetails = async (entityId: string, emails: string[]): Promise<void> => {
    if (!currentTrip || !user) return
    const organiserName = userProfile?.display_name || user.email?.split('@')[0] || 'Organiser'
    const participant = participants.find(p => {
      const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
      return (entityMap.participantToEntityId.get(p.id) ?? p.id) === entityId
    })
    const recipientName = participant?.name || 'there'

    const results = await Promise.allSettled(
      emails.map(email =>
        supabase.functions.invoke('send-email', {
          body: {
            type: 'bank_details_nudge',
            trip_id: currentTrip.id,
            trip_name: currentTrip.name,
            trip_code: currentTrip.trip_code,
            recipient_name: recipientName,
            recipient_email: email,
            organiser_name: organiserName,
          },
        })
      )
    )
    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    if (failures.length === emails.length) {
      throw new Error('Failed to send bank details nudge')
    }
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
          <div className="flex gap-1">
            {expenses.length > 0 && (
              <Button onClick={handleExportPDF} variant="ghost" size="icon" title="Export PDF">
                <FileDown size={18} />
              </Button>
            )}
          </div>
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
                fromEmailMap={currentTrip.enable_settlement_reminders !== false ? fromEmailMap : undefined}
                toEmailMap={currentTrip.enable_settlement_reminders !== false ? toEmailMap : undefined}
                onRemind={user && currentTrip.enable_settlement_reminders !== false ? handleRemind : undefined}
                onNudgeBankDetails={user && currentTrip.enable_settlement_reminders !== false ? handleNudgeBankDetails : undefined}
                avatarMap={avatarMap}
              />
            </CardContent>
          </Card>
        )}

        {/* Action buttons below settlement plan */}
        {participants.length > 0 && (
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => { setPrefill(null); setShowRecordDialog(true) }}
              variant="outline"
              size="sm"
            >
              Log a custom payment
            </Button>
            {canRemindAll && (
              <Button
                onClick={() => setRemindAllOpen(true)}
                variant="outline"
                size="sm"
              >
                <Bell size={14} className="mr-1.5" />
                Remind All
              </Button>
            )}
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
                      {(settlement.created_by == null || settlement.created_by === user?.id) && (
                        <button
                          onClick={() => setDeletingId(settlement.id)}
                          aria-label="Delete settlement"
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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

      {/* Record Settlement overlay */}
      <ResponsiveOverlay
        open={showRecordDialog}
        onClose={closeDialog}
        title="Settle Up"
        hasInputs
        footer={
          <div className="flex gap-3">
            <Button
              onClick={() => formRef.current?.submit()}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Confirming...' : 'Confirm Payment'}
            </Button>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          </div>
        }
        scrollClassName="p-4"
      >
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
      </ResponsiveOverlay>

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

      {/* Remind All confirmation */}
      <AlertDialog open={remindAllOpen} onOpenChange={setRemindAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send reminders to all debtors?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>One email per person with all their outstanding payments:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {Array.from(remindableDebtors.entries()).map(([id, debtor]) => (
                    <li key={id} className="text-sm">
                      <span className="font-medium text-foreground">{debtor.name}</span>
                      <span className="text-muted-foreground"> — {debtor.emails.join(', ')}</span>
                      {debtor.payments.length > 1 && (
                        <span className="text-muted-foreground"> ({debtor.payments.length} payments)</span>
                      )}
                    </li>
                  ))}
                </ul>
                {unreachableCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unreachableCount} {unreachableCount === 1 ? 'participant has' : 'participants have'} no email address and will be skipped.
                  </p>
                )}
                {remindableDebtors.size > 20 && (
                  <p className="text-xs text-amber-600">
                    Large batch — this will send {remindableDebtors.size} emails.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remindAllSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemindAll} disabled={remindAllSending}>
              {remindAllSending ? 'Sending...' : 'Send reminders'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
