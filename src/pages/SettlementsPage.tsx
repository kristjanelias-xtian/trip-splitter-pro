import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Receipt, FileDown } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import { exportSettlementPlanToPDF } from '@/services/pdfExport'
import type { SettlementTransaction } from '@/services/settlementOptimizer'
import type { CreateSettlementInput } from '@/types/settlement'
import { SettlementPlan, BankDetails } from '@/components/SettlementPlan'
import { SettlementForm } from '@/components/SettlementForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export function SettlementsPage() {
  const { currentTrip } = useCurrentTrip()
  const { user, userProfile } = useAuth()
  const { participants, families } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { createSettlement, settlements } = useSettlementContext()
  const { receiptByExpenseId } = useReceiptContext()
  const [showCustomSettlement, setShowCustomSettlement] = useState(false)
  const [prefilledAmount, setPrefilledAmount] = useState<number | undefined>(undefined)
  const [prefilledNote, setPrefilledNote] = useState<string | undefined>(undefined)
  const customSettlementRef = useRef<HTMLDivElement>(null)
  const [bankDetailsMap, setBankDetailsMap] = useState<Record<string, BankDetails>>({})
  const [linkedParticipantIds, setLinkedParticipantIds] = useState<Set<string>>(new Set())

  // Build a map of entity ID (participant ID or family_id) → email for the "from" side of transactions
  const fromEmailMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of participants) {
      if (!p.email) continue
      // In families mode, transactions use family_id as the entity ID
      if (p.family_id) {
        map[p.family_id] = p.email
      }
      map[p.id] = p.email
    }
    return map
  }, [participants])

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
    families,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  ), [expenses, participants, families, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates])

  // Calculate optimal settlement
  const optimalSettlement = useMemo(() => calculateOptimalSettlement(
    balanceCalculation.balances,
    currentTrip.default_currency
  ), [balanceCalculation.balances, currentTrip.default_currency])

  // Stable string key for recipient IDs to avoid infinite re-fetch
  const recipientKey = useMemo(
    () => optimalSettlement.transactions.map(t => t.toId).join(','),
    [optimalSettlement.transactions]
  )

  // Fetch bank details for settlement recipients (only for signed-in users)
  useEffect(() => {
    if (!user) return

    const fetchBankDetails = async () => {
      // Collect recipient participant IDs from the settlement plan
      const recipientIds = optimalSettlement.transactions.map(t => t.toId)
      if (recipientIds.length === 0) return

      // Look up user_ids for these participants (match by participant ID or family ID)
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
          const matchingParticipants = recipientParticipants.filter(p => p.user_id === profile.id)
          for (const p of matchingParticipants) {
            const entityId = p.family_id && recipientIds.includes(p.family_id) ? p.family_id : p.id
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
  }, [user, recipientKey, participants])

  const handleRecordSettlement = (transaction: SettlementTransaction) => {
    // Pre-populate the custom settlement form with amount and note
    setPrefilledAmount(transaction.amount)
    setPrefilledNote(`Settlement from optimal plan: ${transaction.fromName} → ${transaction.toName}`)

    // Expand the custom settlement section
    setShowCustomSettlement(true)

    // Scroll to the custom settlement form
    setTimeout(() => {
      customSettlementRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }, 100)
  }

  const handleCustomSettlement = async (input: CreateSettlementInput) => {
    const result = await createSettlement(input)
    if (!result) {
      throw new Error('Failed to record settlement')
    }
    setShowCustomSettlement(false)
    setPrefilledAmount(undefined)
    setPrefilledNote(undefined)
  }

  const handleRemind = async (transaction: SettlementTransaction, fromEmail: string): Promise<void> => {
    if (!currentTrip || !user) return
    const organiserName = userProfile?.display_name || user.email?.split('@')[0] || 'Organiser'

    // Collect receipt image paths for expenses paid by the creditor (toId)
    // In families mode toId is a family_id; in individuals mode it's a participant ID
    const creditorParticipantIds = new Set(
      currentTrip.tracking_mode === 'families'
        ? participants.filter(p => p.family_id === transaction.toId).map(p => p.id)
        : [transaction.toId]
    )
    const receiptImagePaths: string[] = []
    for (const expense of expenses) {
      if (receiptImagePaths.length >= 3) break
      if (!creditorParticipantIds.has(expense.paid_by)) continue
      const receipt = receiptByExpenseId[expense.id]
      if (receipt?.receipt_image_path) {
        receiptImagePaths.push(receipt.receipt_image_path)
      }
    }

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'payment_reminder',
        trip_id: currentTrip.id,
        trip_name: currentTrip.name,
        trip_code: currentTrip.trip_code,
        recipient_name: transaction.fromName,
        recipient_email: fromEmail,
        amount: transaction.amount,
        currency: currentTrip.default_currency,
        pay_to_name: transaction.toName,
        organiser_name: organiserName,
        ...(receiptImagePaths.length > 0 && { receipt_image_paths: receiptImagePaths }),
      },
    })
    if (error) {
      logger.error('Failed to send payment reminder', { error: String(error) })
      throw new Error('Failed to send reminder')
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
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2">
              <FileDown size={16} />
              Export PDF
            </Button>
          )}
        </div>

        {/* Settlement Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onRecordSettlement={handleRecordSettlement}
                bankDetailsMap={bankDetailsMap}
                linkedParticipantIds={linkedParticipantIds}
                fromEmailMap={fromEmailMap}
                onRemind={user ? handleRemind : undefined}
              />
            </CardContent>
          </Card>
        )}

        {/* Custom Settlement Form */}
        {participants.length > 0 && (
          <Card ref={customSettlementRef}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Record Custom Settlement
                </h3>
                <Button
                  onClick={() => setShowCustomSettlement(!showCustomSettlement)}
                  variant="ghost"
                  size="sm"
                >
                  {showCustomSettlement ? (
                    <><ChevronDown size={16} className="mr-1" /> Hide</>
                  ) : (
                    <><ChevronRight size={16} className="mr-1" /> Add Custom Payment</>
                  )}
                </Button>
              </div>

              {showCustomSettlement && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Record a payment that happened outside of the optimal settlement plan (e.g., partial payments, cash transfers, etc.)
                    {currentTrip.tracking_mode === 'families' && (
                      <span className="block mt-2 text-xs text-accent">
                        Tip: In families mode, select the adult who made/received the payment. The balance will update for their family.
                      </span>
                    )}
                  </p>
                  <SettlementForm
                    onSubmit={handleCustomSettlement}
                    onCancel={() => setShowCustomSettlement(false)}
                    initialAmount={prefilledAmount}
                    initialNote={prefilledNote}
                  />
                </div>
              )}
            </CardContent>
          </Card>
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
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
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
                      <div className="text-right">
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
      </div>
    </>
  )
}
