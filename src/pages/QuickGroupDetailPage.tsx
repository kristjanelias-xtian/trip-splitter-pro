import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { LinkParticipantDialog } from '@/components/LinkParticipantDialog'
import { QuickBalanceHero } from '@/components/quick/QuickBalanceHero'
import { QuickActionButton } from '@/components/quick/QuickActionButton'
import { QuickExpenseSheet } from '@/components/quick/QuickExpenseSheet'
import { QuickSettlementSheet } from '@/components/quick/QuickSettlementSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DollarSign, CreditCard, FileText,
  ExternalLink, ArrowLeftRight, Loader2
} from 'lucide-react'

export function QuickGroupDetailPage() {
  const navigate = useNavigate()
  const { currentTrip, loading: tripLoading } = useCurrentTrip()
  const { myParticipant, isLinked } = useMyParticipant()
  const { participants, families, loading: participantsLoading } = useParticipantContext()
  const { expenses, loading: expensesLoading } = useExpenseContext()
  const { settlements, loading: settlementsLoading } = useSettlementContext()

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)

  const loading = participantsLoading || expensesLoading || settlementsLoading

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
            <p className="text-muted-foreground mb-4">Trip not found</p>
            <Button onClick={() => navigate('/quick')} variant="outline" size="sm">
              Go to My Trips
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        <QuickBalanceHero balance={myBalance} />
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
          My Trips
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
    </div>
  )
}
