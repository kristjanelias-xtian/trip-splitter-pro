// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed,
  Home,
  Car,
  Target,
  Dumbbell,
  Bookmark,
  Edit,
  Trash2,
  Calendar,
  Tag,
  ScanLine,
} from 'lucide-react'
import { useMemo } from 'react'
import { Expense } from '@/types/expense'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { convertToBaseCurrency } from '@/services/balanceCalculator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { buildShortNameMap } from '@/lib/participantUtils'

interface ExpenseCardProps {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
  onViewReceipt?: () => void
}

export function ExpenseCard({ expense, onEdit, onDelete, onViewReceipt }: ExpenseCardProps) {
  const { t } = useTranslation()
  const { participants } = useParticipantContext()
  const { currentTrip } = useCurrentTrip()
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])

  const defaultCurrency = currentTrip?.default_currency || 'EUR'
  const exchangeRates = currentTrip?.exchange_rates || {}
  const isForeignCurrency = expense.currency !== defaultCurrency

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getPaidByName = () => {
    return shortNames.get(expense.paid_by) || t('common.unknown')
  }

  const getDistributionText = () => {
    const dist = expense.distribution
    const ids = dist.type === 'individuals' ? dist.participants : []
    const names = ids
      .map(id => shortNames.get(id))
      .filter(Boolean)
    if (names.length === participants.length) {
      return t('common.everyone')
    }
    return names.length > 0 ? names.join(', ') : t('common.unknown')
  }

  const getCategoryIcon = (category: string) => {
    const iconProps = { size: 20, className: 'text-primary' }
    const icons: Record<string, JSX.Element> = {
      Food: <UtensilsCrossed {...iconProps} />,
      Accommodation: <Home {...iconProps} />,
      Transport: <Car {...iconProps} />,
      Activities: <Target {...iconProps} />,
      Training: <Dumbbell {...iconProps} />,
      Other: <Bookmark {...iconProps} />,
    }
    return icons[category] || <Bookmark {...iconProps} />
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getCategoryIcon(expense.category)}</div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="text-base font-semibold text-foreground break-words">
                  {expense.description}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {t('expenses.paidByLabel', { name: getPaidByName() })}
                </p>

                <p className="text-xs text-muted-foreground">
                  {t('expenses.split', { names: getDistributionText() })}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>{formatDate(expense.expense_date)}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-xs py-0.5 px-2">
                    <Tag size={10} className="mr-1" />
                    {t(`expenses.category${expense.category}`)}
                  </Badge>
                </div>

                {expense.comment && (
                  <p className="text-xs text-muted-foreground italic bg-accent/10 px-2 py-1 rounded">
                    {expense.comment}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="text-right">
              <div className="text-xl font-bold text-foreground whitespace-nowrap tabular-nums">
                {formatAmount(expense.amount, expense.currency)}
              </div>
              {isForeignCurrency && exchangeRates[expense.currency] && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  ({formatAmount(convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates), defaultCurrency)})
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {onViewReceipt && (
                <Button
                  onClick={onViewReceipt}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground"
                  title={t('expenses.viewReceipt')}
                >
                  <ScanLine size={16} />
                </Button>
              )}
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                title={t('expenses.editExpenseTitle')}
              >
                <Edit size={16} />
              </Button>
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title={t('expenses.deleteExpenseTitle')}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
