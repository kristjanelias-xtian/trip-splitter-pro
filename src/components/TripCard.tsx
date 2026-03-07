import { Calendar, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Event } from '@/types/trip'
import { ParticipantBalance, formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { getTripGradientPattern } from '@/services/tripGradientService'

interface TripCardProps {
  trip: Event
  balance?: ParticipantBalance | null
  isActive?: boolean
  onClick: () => void
  actions?: React.ReactNode
}

function formatCardDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function TripCard({ trip, balance, isActive, onClick, actions }: TripCardProps) {
  const pattern = getTripGradientPattern(trip.name)
  const hasDate = trip.start_date || trip.end_date
  const dateLabel = hasDate
    ? trip.end_date && trip.end_date !== trip.start_date
      ? `${formatCardDate(trip.start_date)} – ${formatCardDate(trip.end_date)}`
      : formatCardDate(trip.start_date)
    : null

  return (
    <Card className="overflow-hidden relative">
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
                  <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              {balance ? (
                <p className={`text-lg font-bold tabular-nums ${getBalanceColorClass(balance.balance)}`}>
                  {balance.balance === 0
                    ? 'Settled up'
                    : balance.balance > 0
                      ? `You are owed ${formatBalance(balance.balance)}`
                      : `You owe ${formatBalance(balance.balance).replace('-', '')}`
                  }
                </p>
              ) : balance === null ? (
                <p className="text-sm text-muted-foreground">
                  Link yourself to see your balance
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
