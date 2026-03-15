// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react'
import { ParticipantBalance, formatBalance, getBalanceColorClass, SETTLED_THRESHOLD } from '@/services/balanceCalculator'
import { Card } from '@/components/ui/card'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'
import type { Participant } from '@/types/participant'

interface BalanceCardProps {
  balance: ParticipantBalance
  currency?: string
  onClick?: () => void
  groupMembers?: Array<Pick<Participant, 'name' | 'avatar_url'>>
}

export function BalanceCard({ balance, currency = 'EUR', onClick, groupMembers }: BalanceCardProps) {
  const { t } = useTranslation()
  const balanceColorClass = getBalanceColorClass(balance.balance)
  const formattedBalance = formatBalance(balance.balance, currency)
  const fmt = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value)
  const formattedPaid = fmt(balance.totalPaid)
  const formattedShare = fmt(balance.totalShare)
  const hasSent = balance.totalSettledSent > 0
  const hasReceived = balance.totalSettledReceived > 0

  const getBalanceStatus = () => {
    if (balance.balance > SETTLED_THRESHOLD) {
      return {
        text: t('balance.toReceive'),
        icon: <ArrowDownToLine size={16} className="text-positive" />,
        bgClass: 'bg-positive/5',
        borderClass: 'border-positive/20'
      }
    } else if (balance.balance < -SETTLED_THRESHOLD) {
      return {
        text: t('balance.toPay'),
        icon: <ArrowUpFromLine size={16} className="text-destructive" />,
        bgClass: 'bg-destructive/5',
        borderClass: 'border-destructive/20'
      }
    } else {
      return {
        text: t('balance.settled'),
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
    <CardWrapper {...cardProps} className="h-full">
      <Card
        className={`h-full p-4 border ${status.borderClass} ${status.bgClass} ${
          onClick ? 'cursor-pointer hover:shadow-md' : ''
        } transition-all`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {!(groupMembers && groupMembers.length > 1) && (
                <ParticipantAvatar
                  participant={{ name: balance.name, avatar_url: groupMembers?.[0]?.avatar_url ?? null }}
                  size="md"
                />
              )}
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
          {groupMembers && groupMembers.length > 1 && (
            <div className="flex items-center gap-1 mt-2">
              {groupMembers.slice(0, 4).map((member, i) => (
                <div key={i}>
                  <ParticipantAvatar participant={member} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('balance.outOfPocket')}</span>
            <span className="font-medium text-foreground tabular-nums">{formattedPaid}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('balance.share')}</span>
            <span className="font-medium text-foreground tabular-nums">{formattedShare}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('balance.settledLabel')}</span>
            <span className="font-medium text-foreground tabular-nums text-right">
              {!hasSent && !hasReceived ? '—' : (
                <>
                  {hasReceived && <span className="block">{t('balance.received', { amount: fmt(balance.totalSettledReceived) })}</span>}
                  {hasSent && <span className="block">{t('balance.sent', { amount: fmt(balance.totalSettledSent) })}</span>}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            {status.icon}
            <span className="text-muted-foreground">
              {Math.abs(balance.balance) <= SETTLED_THRESHOLD ? (
                t('balance.allSettledUp')
              ) : balance.balance > 0 ? (
                <>{t('balance.othersOwe')} <strong className={`${balanceColorClass} tabular-nums`}>{formatBalance(balance.balance, currency)}</strong></>
              ) : (
                <>{t('balance.owes')} <strong className={`${balanceColorClass} tabular-nums`}>{formatBalance(Math.abs(balance.balance), currency)}</strong></>
              )}
            </span>
          </div>
        </div>
      </Card>
    </CardWrapper>
  )
}
