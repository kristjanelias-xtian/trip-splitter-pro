import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { LinkParticipantDialog } from '@/components/LinkParticipantDialog'
import { QuickBalanceHero } from '@/components/quick/QuickBalanceHero'
import { QuickActionButton } from '@/components/quick/QuickActionButton'
import { QuickExpenseSheet } from '@/components/quick/QuickExpenseSheet'
import { QuickSettlementSheet } from '@/components/quick/QuickSettlementSheet'
import { ReceiptCaptureSheet } from '@/components/receipts/ReceiptCaptureSheet'
import { ReceiptReviewSheet } from '@/components/receipts/ReceiptReviewSheet'
import { QuickParticipantSetupSheet } from '@/components/quick/QuickParticipantSetupSheet'
import { QuickGroupMembersSheet } from '@/components/quick/QuickGroupMembersSheet'
import { ExtractedItem } from '@/types/receipt'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  DollarSign, CreditCard, FileText, ScanLine,
  ExternalLink, ArrowLeftRight, Loader2, RefreshCw, AlertCircle, Users
} from 'lucide-react'


interface ReceiptReviewData {
  taskId: string
  merchant: string | null
  items: ExtractedItem[]
  total: number | null
  currency: string
  imagePath: string | null
}

export function QuickGroupDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentTrip, loading: tripLoading } = useCurrentTrip()
  const { myParticipant, isLinked } = useMyParticipant()
  const { participants, families, loading: participantsLoading, error: participantError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: expensesLoading, error: expenseError, refreshExpenses } = useExpenseContext()
  const { settlements, loading: settlementsLoading, error: settlementError, refreshSettlements } = useSettlementContext()

  const { pendingReceipts, dismissReceiptTask } = useReceiptContext()
  const { toast } = useToast()

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [receiptCaptureOpen, setReceiptCaptureOpen] = useState(false)
  const [participantSetupOpen, setParticipantSetupOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [receiptReviewData, setReceiptReviewData] = useState<ReceiptReviewData | null>(null)
  const [slowLoading, setSlowLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)

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

  // Show "taking longer than expected" after 8 seconds of loading
  useEffect(() => {
    if (!loading) {
      setSlowLoading(false)
      return
    }
    const timer = setTimeout(() => setSlowLoading(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])

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
            <Button onClick={() => navigate('/quick')} variant="outline" size="sm">
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
    families,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  )

  // Find user's balance
  let myBalance = null
  if (myParticipant) {
    if (currentTrip.tracking_mode === 'families' && myParticipant.family_id) {
      myBalance = balanceCalc.balances.find(b => b.id === myParticipant.family_id) || null
    } else {
      myBalance = balanceCalc.balances.find(b => b.id === myParticipant.id) || null
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Balance hero */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          {slowLoading && (
            <p className="text-sm text-muted-foreground">Taking longer than expected...</p>
          )}
        </div>
      ) : contextError ? (
        <Card className="mb-6 border-destructive/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive mb-3">{contextError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
              className="gap-2"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          </CardContent>
        </Card>
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
        <div className="relative">
          <QuickBalanceHero balance={myBalance} />
          {balanceCalc.balances.length > 0 && (
            <button
              onClick={() => setMembersOpen(true)}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users size={13} />
              <span>{balanceCalc.balances.length}</span>
            </button>
          )}
        </div>
      )}

      {/* Pending receipts banner */}
      {pendingReceipts.length > 0 && (
        <div className="space-y-2 mb-2">
          {pendingReceipts.map(task => (
            <div
              key={task.id}
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 min-w-0">
                  <ScanLine size={16} className="shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">Unreviewed receipt</span>
                    {task.extracted_merchant && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 truncate mt-0.5">
                        {task.extracted_merchant}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setReceiptReviewData({
                        taskId: task.id,
                        merchant: task.extracted_merchant,
                        items: task.extracted_items ?? [],
                        total: task.extracted_total,
                        currency: task.extracted_currency ?? currentTrip.default_currency,
                        imagePath: task.receipt_image_path ?? null,
                      })
                    }
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => dismissReceiptTask(task.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
          icon={DollarSign}
          label="Add an expense"
          description="Split a bill with the group"
          onClick={() => setExpenseOpen(true)}
        />
        <QuickActionButton
          icon={ScanLine}
          label="Scan a receipt"
          description="Let AI read and split itemised bills"
          onClick={() => setReceiptCaptureOpen(true)}
        />
        <QuickActionButton
          icon={CreditCard}
          label="Log your payment"
          description="Record a payment you made"
          onClick={() => setSettlementOpen(true)}
        />
        <QuickActionButton
          icon={FileText}
          label="View expenses & payments"
          description="See transaction history"
          onClick={() => navigate(`/t/${currentTrip.trip_code}/quick/history`)}
        />
      </div>

      {/* Bottom actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate('/quick')}
        >
          <ArrowLeftRight size={16} />
          My Groups
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate(`/t/${currentTrip.trip_code}/dashboard`)}
        >
          <ExternalLink size={16} />
          See in Full Mode
        </Button>
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
      />
    </div>
  )
}
