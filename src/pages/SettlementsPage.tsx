import { useState } from 'react'
import { ChevronDown, ChevronRight, Receipt, FileDown } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { calculateOptimalSettlement } from '@/services/settlementOptimizer'
import { exportSettlementPlanToPDF } from '@/services/pdfExport'
import type { SettlementTransaction } from '@/services/settlementOptimizer'
import type { CreateSettlementInput } from '@/types/settlement'
import { SettlementPlan } from '@/components/SettlementPlan'
import { SettlementForm } from '@/components/SettlementForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function SettlementsPage() {
  const { currentTrip } = useCurrentTrip()
  const { participants, families } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { createSettlement, settlements } = useSettlementContext()
  const [recordingSettlement, setRecordingSettlement] = useState(false)
  const [showCustomSettlement, setShowCustomSettlement] = useState(false)
  const [confirmingTransaction, setConfirmingTransaction] = useState<SettlementTransaction | null>(null)

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

  // Calculate balances (including settlements)
  const balanceCalculation = calculateBalances(
    expenses,
    participants,
    families,
    currentTrip.tracking_mode,
    settlements
  )

  // Calculate optimal settlement
  const optimalSettlement = calculateOptimalSettlement(
    balanceCalculation.balances,
    'EUR' // TODO: Get from trip settings
  )

  const handleRecordSettlement = async (transaction: SettlementTransaction) => {
    if (recordingSettlement) return
    setConfirmingTransaction(transaction)
  }

  const confirmRecordSettlement = async () => {
    if (!confirmingTransaction || recordingSettlement) return

    setRecordingSettlement(true)
    try {
      const result = await createSettlement({
        trip_id: currentTrip.id,
        from_participant_id: confirmingTransaction.fromId,
        to_participant_id: confirmingTransaction.toId,
        amount: confirmingTransaction.amount,
        currency: 'EUR',
        note: 'Settlement recorded from optimal plan',
      })

      if (result) {
        setConfirmingTransaction(null)
      }
    } catch (error) {
      console.error('Error recording settlement:', error)
    } finally {
      setRecordingSettlement(false)
    }
  }

  const handleCustomSettlement = async (input: CreateSettlementInput) => {
    try {
      const result = await createSettlement(input)

      if (result) {
        setShowCustomSettlement(false)
      }
    } catch (error) {
      console.error('Error recording custom settlement:', error)
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
                  currency: 'EUR',
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
              <SettlementPlan plan={optimalSettlement} onRecordSettlement={handleRecordSettlement} />
            </CardContent>
          </Card>
        )}

        {/* Custom Settlement Form */}
        {participants.length > 0 && (
          <Card>
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

      {/* Record Settlement Confirmation Dialog */}
      <Dialog open={!!confirmingTransaction} onOpenChange={(open) => !open && setConfirmingTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Settlement?</DialogTitle>
            <DialogDescription>
              {confirmingTransaction && (
                <>
                  {confirmingTransaction.fromName} pays {confirmingTransaction.toName}{' '}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(confirmingTransaction.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmingTransaction(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={confirmRecordSettlement} disabled={recordingSettlement}>
              {recordingSettlement ? 'Recording...' : 'Record Settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
