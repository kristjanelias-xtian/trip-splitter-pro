import { useState, useEffect, useCallback } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { calculateBalances, buildEntityMap } from '@/services/balanceCalculator'
import { LinkParticipantDialog } from '@/components/LinkParticipantDialog'
import { QuickBalanceHero } from '@/components/quick/QuickBalanceHero'
import { QuickActionButton } from '@/components/quick/QuickActionButton'
import { QuickExpenseSheet } from '@/components/quick/QuickExpenseSheet'
import { QuickSettlementSheet } from '@/components/quick/QuickSettlementSheet'
import { ReceiptCaptureSheet } from '@/components/receipts/ReceiptCaptureSheet'
import { ReceiptReviewSheet } from '@/components/receipts/ReceiptReviewSheet'
import { QuickParticipantSetupSheet } from '@/components/quick/QuickParticipantSetupSheet'
import { QuickGroupMembersSheet } from '@/components/quick/QuickGroupMembersSheet'
import { QuickHistorySheet } from '@/components/quick/QuickHistorySheet'
import { PendingReceiptBanner, ReceiptReviewData } from '@/components/receipts/PendingReceiptBanner'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useBankDetailsPrompt } from '@/hooks/useBankDetailsPrompt'
import { BankDetailsDialog } from '@/components/auth/BankDetailsDialog'
import {
  DollarSign, CreditCard, FileText, ScanLine,
  Loader2, Users, Landmark, X
} from 'lucide-react'

export function QuickGroupDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentTrip, loading: tripLoading } = useCurrentTrip()
  const { myParticipant, isLinked } = useMyParticipant()
  const { participants, loading: participantsLoading, error: participantError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: expensesLoading, error: expenseError, refreshExpenses } = useExpenseContext()
  const { settlements, loading: settlementsLoading, error: settlementError, refreshSettlements } = useSettlementContext()

  const { pendingReceipts, dismissReceiptTask } = useReceiptContext()
  const { toast } = useToast()

  const handleRefresh = useCallback(
    () => Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()]).then(() => {}),
    [refreshParticipants, refreshExpenses, refreshSettlements]
  )
  useRegisterRefresh(handleRefresh)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [receiptCaptureOpen, setReceiptCaptureOpen] = useState(false)
  const [participantSetupOpen, setParticipantSetupOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [receiptReviewData, setReceiptReviewData] = useState<ReceiptReviewData | null>(null)
  const [retrying, setRetrying] = useState(false)
  const bankPrompt = useBankDetailsPrompt()
  // Open receipt capture sheet when navigated here with openScan state
  useEffect(() => {
    if ((location.state as any)?.openScan) {
      setReceiptCaptureOpen(true)
      // Clear the state so back-navigation doesn't re-open it
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const loading = participantsLoading || expensesLoading || settlementsLoading
  const contextError = participantError || expenseError || settlementError

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await Promise.all([refreshParticipants(), refreshExpenses(), refreshSettlements()])
    } finally {
      setRetrying(false)
    }
  }

  const entityLabel = currentTrip?.event_type === 'event' ? 'Event' : 'Trip'

  if (tripLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!currentTrip) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{entityLabel} not found</p>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              My Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate balance (with currency conversion)
  const balanceCalc = calculateBalances(
    expenses,
    participants,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  )

  // Find user's balance via entity map
  let myBalance = null
  if (myParticipant) {
    const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
    const myEntityId = entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id
    myBalance = balanceCalc.balances.find(b => b.id === myEntityId) || null
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Balance hero */}
      {loading ? (
        <PageLoadingState />
      ) : contextError ? (
        <div className="mb-6">
          <PageErrorState error={contextError} onRetry={handleRetry} retrying={retrying} />
        </div>
      ) : !isLinked ? (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Link yourself to a participant to see your balance
            </p>
            <LinkParticipantDialog />
          </CardContent>
        </Card>
      ) : (
        <div>
          <QuickBalanceHero balance={myBalance} />
          {balanceCalc.balances.length > 0 && (
            <div className="flex justify-center -mt-1 mb-5">
              <button
                onClick={() => setMembersOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Users size={13} />
                <span>{balanceCalc.balances.length} members</span>
              </button>
            </div>
          )}
          {bankPrompt.shouldShowNudge(!!myBalance && myBalance.balance > 0) && (
            <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Landmark size={18} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Add your bank details</p>
                    <p className="text-xs text-muted-foreground">So others know where to pay you</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => bankPrompt.setDialogOpen(true)}>Add</Button>
                  <button
                    onClick={bankPrompt.dismiss}
                    aria-label="Dismiss"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pending receipts banner */}
      <div className="mb-2">
        <PendingReceiptBanner
          tasks={pendingReceipts}
          defaultCurrency={currentTrip.default_currency}
          onReview={setReceiptReviewData}
          onDismiss={dismissReceiptTask}
        />
      </div>

      {/* Participant setup nudge */}
      {!loading && !contextError && participants.length <= 1 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Set up your group</p>
              <p className="text-xs text-muted-foreground">Add the people sharing costs</p>
            </div>
            <Button size="sm" onClick={() => setParticipantSetupOpen(true)}>Add</Button>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="space-y-3 mb-6">
        <QuickActionButton
          icon={ScanLine}
          label="Scan a receipt"
          description="Let AI read and split itemised bills"
          onClick={() => setReceiptCaptureOpen(true)}
          emphasis
        />
        <QuickActionButton
          icon={DollarSign}
          label="Add an expense"
          description="Split a bill with the group"
          onClick={() => setExpenseOpen(true)}
        />
        <QuickActionButton
          icon={CreditCard}
          label="Settle up"
          description="Record a payment between people"
          onClick={() => setSettlementOpen(true)}
        />
        <QuickActionButton
          icon={FileText}
          label="View expenses & payments"
          description="See transaction history"
          onClick={() => setHistoryOpen(true)}
        />
      </div>

      {/* Expense sheet */}
      <QuickExpenseSheet
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
      />

      {/* Settlement sheet */}
      <QuickSettlementSheet
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
      />

      {/* Receipt capture */}
      <ReceiptCaptureSheet
        open={receiptCaptureOpen}
        onOpenChange={setReceiptCaptureOpen}
        onScanned={(_taskId) => {
          setReceiptCaptureOpen(false)
          toast({ title: 'Receipt scanned', description: 'Review it using the banner above.' })
        }}
      />

      {/* Receipt review */}
      {receiptReviewData && (
        <ReceiptReviewSheet
          open={!!receiptReviewData}
          onOpenChange={open => { if (!open) setReceiptReviewData(null) }}
          taskId={receiptReviewData.taskId}
          merchant={receiptReviewData.merchant}
          items={receiptReviewData.items}
          extractedTotal={receiptReviewData.total}
          currency={receiptReviewData.currency}
          imagePath={receiptReviewData.imagePath}
          extractedCategory={receiptReviewData.category}
          onDone={() => setReceiptReviewData(null)}
        />
      )}

      {/* Participant setup sheet */}
      <QuickParticipantSetupSheet
        open={participantSetupOpen}
        onOpenChange={setParticipantSetupOpen}
      />

      {/* Group members sheet */}
      <QuickGroupMembersSheet
        open={membersOpen}
        onOpenChange={setMembersOpen}
        balances={balanceCalc.balances}
        myParticipantId={myBalance?.id ?? null}
        currency={currentTrip.default_currency}
        participants={participants}
        expenses={expenses}
        exchangeRates={currentTrip.exchange_rates}
        settlements={settlements}
      />

      {/* History sheet */}
      <QuickHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      {/* Bank details dialog */}
      <BankDetailsDialog open={bankPrompt.dialogOpen} onOpenChange={bankPrompt.setDialogOpen} />
    </div>
  )
}
