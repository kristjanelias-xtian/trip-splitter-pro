// SPDX-License-Identifier: Apache-2.0
import { useNavigate } from 'react-router-dom'
import { HandCoins, X, Bell } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { usePostTripNudge } from '@/hooks/usePostTripNudge'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { formatBalance } from '@/services/balanceCalculator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PostTripNudgeBannerProps {
  /** Quick mode: opens settle-up sheet instead of navigating */
  onSettleUp?: () => void
  /** Creator: triggers batch remind-all flow */
  onRemindAll?: () => void
}

export function PostTripNudgeBanner({ onSettleUp, onRemindAll }: PostTripNudgeBannerProps) {
  const navigate = useNavigate()
  const { currentTrip } = useCurrentTrip()
  const { mode } = useUserPreferences()
  const {
    showCreatorBanner,
    showDebtorBanner,
    totalOwed,
    transactionsNeeded,
    myBalance,
    dismiss,
  } = usePostTripNudge()

  if (!currentTrip) return null
  if (!showCreatorBanner && !showDebtorBanner) return null

  const currency = currentTrip.default_currency

  const handleAction = () => {
    if (onSettleUp) {
      onSettleUp()
    } else if (mode === 'quick') {
      navigate(`/t/${currentTrip.trip_code}/quick`)
    } else {
      navigate(`/t/${currentTrip.trip_code}/settlements`)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <HandCoins size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            {showCreatorBanner ? (
              <>
                <p className="font-medium text-sm">
                  {transactionsNeeded} {transactionsNeeded === 1 ? 'payment' : 'payments'} still outstanding
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBalance(totalOwed, currency).replace('-', '')} to collect
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm">
                  You owe {formatBalance(Math.abs(myBalance!), currency)} from {currentTrip.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trip has ended — time to settle up
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showCreatorBanner && onRemindAll && (
            <Button size="sm" variant="outline" onClick={onRemindAll}>
              <Bell size={14} className="mr-1" />
              Remind
            </Button>
          )}
          <Button size="sm" onClick={handleAction}>
            {showCreatorBanner ? 'View' : 'Settle'}
          </Button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
