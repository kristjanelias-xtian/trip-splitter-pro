import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react'
import { ParticipantBalance } from '@/services/balanceCalculator'
import { formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { Card } from '@/components/ui/card'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'

interface BalanceCardProps {
  balance: ParticipantBalance
  currency?: string
  onClick?: () => void
  avatarUrl?: string | null
}

export function BalanceCard({ balance, currency = 'EUR', onClick, avatarUrl }: BalanceCardProps) {
  const balanceColorClass = getBalanceColorClass(balance.balance)
  const formattedBalance = formatBalance(balance.balance, currency)
  const fmt = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value)
  const formattedPaid = fmt(balance.totalPaid)
  const formattedShare = fmt(balance.totalShare)
  const formattedSettled = balance.totalSettled !== 0
    ? `${fmt(Math.abs(balance.totalSettled))} ${balance.totalSettled > 0 ? 'sent' : 'received'}`
    : '—'

  const getBalanceStatus = () => {
    if (balance.balance > 0.01) {
      return {
        text: 'To receive',
        icon: <ArrowDownToLine size={16} className="text-positive" />,
        bgClass: 'bg-positive/5',
        borderClass: 'border-positive/20'
      }
    } else if (balance.balance < -0.01) {
      return {
        text: 'To pay',
        icon: <ArrowUpFromLine size={16} className="text-destructive" />,
        bgClass: 'bg-destructive/5',
        borderClass: 'border-destructive/20'
      }
    } else {
      return {
        text: 'Settled',
        icon: <CheckCircle2 size={16} className="text-accent" />,
        bgClass: 'bg-accent/5',
        borderClass: 'border-accent/20'
      }
    }
  }

  const status = getBalanceStatus()

  const CardWrapper = onClick ? motion.div : 'div'
  const cardProps = onClick ? {
    whileHover: { y: -2 },
    transition: { duration: 0.2 }
  } : {}

  return (
    <CardWrapper {...cardProps}>
      <Card
        className={`p-4 border ${status.borderClass} ${status.bgClass} ${
          onClick ? 'cursor-pointer hover:shadow-md' : ''
        } transition-all`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ParticipantAvatar participant={{ name: balance.name, avatar_url: avatarUrl ?? null }} size="md" />
            <h3 className="text-lg font-semibold text-foreground truncate">
              {balance.name}
            </h3>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground mb-1">{status.text}</span>
            <span className={`text-2xl font-bold tabular-nums ${balanceColorClass}`}>
              {formattedBalance}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Out of pocket:</span>
            <span className="font-medium text-foreground tabular-nums">{formattedPaid}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Share:</span>
            <span className="font-medium text-foreground tabular-nums">{formattedShare}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Settled:</span>
            <span className="font-medium text-foreground tabular-nums">{formattedSettled}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            {status.icon}
            <span className="text-muted-foreground">
              {Math.abs(balance.balance) < 0.01 ? (
                'All settled up!'
              ) : balance.balance > 0 ? (
                <>Others owe <strong className={`${balanceColorClass} tabular-nums`}>{formatBalance(balance.balance, currency)}</strong></>
              ) : (
                <>Owes <strong className={`${balanceColorClass} tabular-nums`}>{formatBalance(Math.abs(balance.balance), currency)}</strong></>
              )}
            </span>
          </div>
        </div>
      </Card>
    </CardWrapper>
  )
}
