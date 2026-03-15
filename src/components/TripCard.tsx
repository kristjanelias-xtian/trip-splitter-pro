// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Event } from '@/types/trip'
import { ParticipantBalance, formatBalance, getBalanceColorClass, SETTLED_THRESHOLD } from '@/services/balanceCalculator'
import { getTripGradientPattern } from '@/services/tripGradientService'

interface TripCardProps {
  trip: Event
  balance?: ParticipantBalance | null
  isActive?: boolean
  isEnded?: boolean
  onClick: () => void
  actions?: React.ReactNode
}

function formatCardDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function TripCard({ trip, balance, isActive, isEnded, onClick, actions }: TripCardProps) {
  const { t } = useTranslation()
  const pattern = getTripGradientPattern(trip.name)
  const hasDate = trip.start_date || trip.end_date
  const dateLabel = hasDate
    ? trip.end_date && trip.end_date !== trip.start_date
      ? `${formatCardDate(trip.start_date)} – ${formatCardDate(trip.end_date)}`
      : formatCardDate(trip.start_date)
    : null

  return (
    <Card className={`overflow-hidden relative ${isActive ? 'ring-1 ring-primary/30' : ''}`}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: pattern.gradient }}
      />
      <div
        className="cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {trip.name}
                </h3>
                {isActive && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                    </span>
                    {t('trip.active')}
                  </span>
                )}
                {isEnded && balance && Math.abs(balance.balance) > SETTLED_THRESHOLD && (
                  <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    {t('balance.needsSettling')}
                  </span>
                )}
              </div>
              {balance ? (
                <p className={`text-lg font-bold tabular-nums ${getBalanceColorClass(balance.balance)}`}>
                  {Math.abs(balance.balance) <= SETTLED_THRESHOLD
                    ? t('balance.settledUpLabel')
                    : balance.balance > 0
                      ? t('balance.youAreOwed', { amount: formatBalance(balance.balance) })
                      : t('balance.youOwe', { amount: formatBalance(balance.balance).replace('-', '') })
                  }
                </p>
              ) : balance === null ? (
                <p className="text-sm text-muted-foreground">
                  {t('balance.linkToSeeBalance')}
                </p>
              ) : null}
              {dateLabel && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar size={12} />
                  <span>{dateLabel}</span>
                </div>
              )}
            </div>
            <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-3" />
          </div>
        </CardContent>
      </div>
      {actions && (
        <div className="px-4 pb-2 flex justify-end">
          {actions}
        </div>
      )}
    </Card>
  )
}
