import { lazy, Suspense, useState, useCallback, useMemo } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { Lightbulb, Receipt, FileDown, Share2, Landmark, X } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useBankDetailsPrompt } from '@/hooks/useBankDetailsPrompt'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { calculateBalances, buildEntityMap } from '@/services/balanceCalculator'
import { exportTripSummaryToPDF } from '@/services/pdfExport'
import { BalanceCard } from '@/components/BalanceCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ShareTripDialog } from '@/components/ShareTripDialog'
import { BankDetailsDialog } from '@/components/auth/BankDetailsDialog'
import { CostBreakdownDialog } from '@/components/CostBreakdownDialog'
import { ParticipantBalance } from '@/services/balanceCalculator'
import type { Participant } from '@/types/participant'

// Lazy load chart components for better performance
const ExpenseByCategoryChart = lazy(() => import('@/components/ExpenseByCategoryChart').then(m => ({ default: m.ExpenseByCategoryChart })))
const CostPerParticipantChart = lazy(() => import('@/components/CostPerParticipantChart').then(m => ({ default: m.CostPerParticipantChart })))
const TopExpensesList = lazy(() => import('@/components/TopExpensesList').then(m => ({ default: m.TopExpensesList })))

export function DashboardPage() {
  const { currentTrip, tripCode } = useCurrentTrip()
  const { participants, loading: pLoading, error: pError, refreshParticipants } = useParticipantContext()
  const { expenses, loading: eLoading, error: eError, refreshExpenses } = useExpenseContext()
  const { settlements, loading: sLoading, error: sError, refreshSettlements } = useSettlementContext()
  const { myParticipant } = useMyParticipant()
  const bankPrompt = useBankDetailsPrompt()
  const [selectedBalance, setSelectedBalance] = useState<ParticipantBalance | null>(null)
  const [retrying, setRetrying] = useState(false)

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

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to view the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate balances (including settlements, with currency conversion)
  const balanceCalculation = calculateBalances(
    expenses,
    participants,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  )

  // Round display balances to 2dp to avoid floating-point accumulation artefacts
  const displayBalances = balanceCalculation.balances.map(b => ({
    ...b,
    balance: Math.round(b.balance * 100) / 100,
  }))

  const groupMembersMap = useMemo(() => {
    const map: Record<string, Array<Pick<Participant, 'name' | 'avatar_url'>>> = {}
    for (const b of displayBalances) {
      if (b.isFamily) {
        const canonical = participants.find(p => p.id === b.id)
        const groupName = canonical?.wallet_group
        if (groupName) {
          map[b.id] = participants
            .filter(p => p.wallet_group === groupName)
            .map(p => ({ name: p.name, avatar_url: p.avatar_url ?? null }))
        }
      }
      if (!map[b.id]) {
        const p = participants.find(pp => pp.id === b.id)
        map[b.id] = [{ name: p?.name ?? b.name, avatar_url: p?.avatar_url ?? null }]
      }
    }
    return map
  }, [displayBalances, participants])

  const handleExportPDF = () => {
    exportTripSummaryToPDF(currentTrip, expenses, participants, balanceCalculation.balances)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        </div>
        <div className="flex gap-2">
          <ShareTripDialog
            tripCode={tripCode!}
            tripName={currentTrip.name}
            trigger={
              <Button variant="ghost" size="icon" title="Share Trip">
                <Share2 size={18} />
              </Button>
            }
          />
          {expenses.length > 0 && (
            <Button onClick={handleExportPDF} variant="ghost" size="icon" title="Export Summary">
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
      {/* Trip Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
            <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currentTrip.default_currency,
              }).format(balanceCalculation.totalExpenses)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Participants</div>
            <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
              {participants.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {participants.length === 1 ? 'participant' : 'participants'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Unsettled Balance</div>
            <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currentTrip.default_currency,
              }).format(
                Math.abs(displayBalances
                  .filter(b => b.balance < 0)
                  .reduce((sum, b) => sum + b.balance, 0))
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total amount owed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Settlements</div>
            <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
              {settlements.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <Link
                to={`/t/${tripCode}/settlements`}
                className="text-accent hover:underline"
              >
                View settlements →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balances */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Current Balances
        </h3>

        {displayBalances.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No expenses recorded yet. Add your first expense to see balances.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayBalances.map(balance => (
              <BalanceCard key={balance.id} balance={balance} currency={currentTrip.default_currency} onClick={() => setSelectedBalance(balance)} groupMembers={groupMembersMap[balance.id]} />
            ))}
          </div>
        )}
      </div>

      {/* Suggested Next Payer */}
      {balanceCalculation.suggestedNextPayer && expenses.length > 0 && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lightbulb size={20} className="text-accent mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Smart Payer Suggestion
                </h3>
                <p className="text-sm text-muted-foreground">
                  For the next expense, <strong className="text-foreground">{balanceCalculation.suggestedNextPayer.name}</strong>{' '}
                  should pay to balance things out.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank details nudge */}
      {(() => {
        if (!myParticipant || !currentTrip) return null
        const entityMap = buildEntityMap(participants, currentTrip.tracking_mode)
        const myEntityId = entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id
        const myBal = displayBalances.find(b => b.id === myEntityId)
        if (!bankPrompt.shouldShowNudge(!!myBal && myBal.balance > 0)) return null
        return (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
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
        )
      })()}

      {/* Analytics & Insights */}
      {expenses.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground mt-8 mb-4">
            Analytics & Insights
          </h3>

          <div className="space-y-6">
            {/* Top 5 Expenses */}
            <Suspense fallback={
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    Loading...
                  </div>
                </CardContent>
              </Card>
            }>
              <TopExpensesList
                expenses={expenses}
                participants={participants}
                limit={5}
                currency={currentTrip.default_currency}
                exchangeRates={currentTrip.exchange_rates}
              />
            </Suspense>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense by Category Chart */}
              <Suspense fallback={
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      Loading chart...
                    </div>
                  </CardContent>
                </Card>
              }>
                <ExpenseByCategoryChart expenses={expenses} currency={currentTrip.default_currency} exchangeRates={currentTrip.exchange_rates} />
              </Suspense>

              {/* Cost per Participant Chart */}
              <Suspense fallback={
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      Loading chart...
                    </div>
                  </CardContent>
                </Card>
              }>
                <CostPerParticipantChart balances={balanceCalculation.balances} currency={currentTrip.default_currency} />
              </Suspense>
            </div>
          </div>
        </>
      )}

      </>}

      {/* Bank details dialog */}
      <BankDetailsDialog open={bankPrompt.dialogOpen} onOpenChange={bankPrompt.setDialogOpen} />

      {/* Cost Breakdown Dialog */}
      {selectedBalance && (
        <CostBreakdownDialog
          open={!!selectedBalance}
          onOpenChange={(open) => { if (!open) setSelectedBalance(null) }}
          balance={selectedBalance}
          expenses={expenses}
          participants={participants}
          trackingMode={currentTrip.tracking_mode}
          defaultCurrency={currentTrip.default_currency}
          exchangeRates={currentTrip.exchange_rates}
          settlements={settlements}
        />
      )}
    </div>
  )
}
