import { lazy, Suspense, useState } from 'react'
import { Lightbulb, Receipt, FileDown, Share2 } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { exportTripSummaryToPDF } from '@/services/pdfExport'
import { BalanceCard } from '@/components/BalanceCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ShareTripDialog } from '@/components/ShareTripDialog'
import { CostBreakdownDialog } from '@/components/CostBreakdownDialog'
import { ParticipantBalance } from '@/services/balanceCalculator'

// Lazy load chart components for better performance
const ExpenseByCategoryChart = lazy(() => import('@/components/ExpenseByCategoryChart').then(m => ({ default: m.ExpenseByCategoryChart })))
const CostPerParticipantChart = lazy(() => import('@/components/CostPerParticipantChart').then(m => ({ default: m.CostPerParticipantChart })))
const TopExpensesList = lazy(() => import('@/components/TopExpensesList').then(m => ({ default: m.TopExpensesList })))

export function DashboardPage() {
  const { currentTrip, tripCode } = useCurrentTrip()
  const { participants, families } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()
  const [selectedBalance, setSelectedBalance] = useState<ParticipantBalance | null>(null)

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
    families,
    currentTrip.tracking_mode,
    settlements,
    currentTrip.default_currency,
    currentTrip.exchange_rates
  )

  const handleExportPDF = () => {
    exportTripSummaryToPDF(currentTrip, expenses, participants, balanceCalculation.balances)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">{currentTrip.name}</p>
        </div>
        <div className="flex gap-2">
          <ShareTripDialog
            tripCode={tripCode!}
            tripName={currentTrip.name}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 size={16} />
                Share Trip
              </Button>
            }
          />
          {expenses.length > 0 && (
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2">
              <FileDown size={16} />
              Export Summary
            </Button>
          )}
        </div>
      </div>

      {/* Trip Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
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
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {currentTrip.tracking_mode === 'families'
                ? families.length + participants.filter(p => p.family_id === null).length
                : participants.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {currentTrip.tracking_mode === 'families'
                ? (() => {
                    const standaloneCount = participants.filter(p => p.family_id === null).length
                    if (standaloneCount === 0) return `${families.length} ${families.length === 1 ? 'family' : 'families'}`
                    if (families.length === 0) return `${standaloneCount} ${standaloneCount === 1 ? 'individual' : 'individuals'}`
                    return `${families.length} ${families.length === 1 ? 'family' : 'families'}, ${standaloneCount} ${standaloneCount === 1 ? 'individual' : 'individuals'}`
                  })()
                : 'individuals'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Unsettled Balance</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currentTrip.default_currency,
              }).format(
                Math.abs(balanceCalculation.balances
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
            <div className="text-2xl font-bold text-foreground tabular-nums">
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

        {balanceCalculation.balances.length === 0 ? (
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
            {balanceCalculation.balances.map(balance => (
              <BalanceCard key={balance.id} balance={balance} currency={currentTrip.default_currency} onClick={() => setSelectedBalance(balance)} />
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

      {/* Cost Breakdown Dialog */}
      {selectedBalance && (
        <CostBreakdownDialog
          open={!!selectedBalance}
          onOpenChange={(open) => { if (!open) setSelectedBalance(null) }}
          balance={selectedBalance}
          expenses={expenses}
          participants={participants}
          families={families}
          trackingMode={currentTrip.tracking_mode}
          defaultCurrency={currentTrip.default_currency}
          exchangeRates={currentTrip.exchange_rates}
        />
      )}
    </div>
  )
}
