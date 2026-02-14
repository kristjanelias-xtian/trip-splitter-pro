import { TransactionItem as TxItem } from '@/services/transactionHistoryBuilder'
import { convertToBaseCurrency } from '@/services/balanceCalculator'
import { DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface TransactionItemProps {
  transaction: TxItem
  defaultCurrency?: string
  exchangeRates?: Record<string, number>
}

export function TransactionItem({ transaction: tx, defaultCurrency, exchangeRates }: TransactionItemProps) {
  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDualCurrency = (amount: number, currency: string) => {
    const base = formatAmount(amount, currency)
    if (!defaultCurrency || !exchangeRates || currency === defaultCurrency) return base
    const converted = convertToBaseCurrency(amount, currency, defaultCurrency, exchangeRates)
    return `${formatAmount(converted, defaultCurrency)} (${base})`
  }

  const getRoleDisplay = () => {
    switch (tx.role) {
      case 'you_paid':
        return {
          label: 'You paid',
          icon: <DollarSign size={16} className="text-primary" />,
          amountText: formatDualCurrency(tx.roleAmount, tx.currency),
          subText: tx.myShare !== undefined ? `Your share: ${formatDualCurrency(tx.myShare, tx.currency)}` : null,
          amountClass: 'text-foreground font-semibold',
          bgClass: 'bg-primary/5',
        }
      case 'your_share':
        return {
          label: `${tx.payerName} paid`,
          icon: <DollarSign size={16} className="text-muted-foreground" />,
          amountText: `Your share: ${formatDualCurrency(tx.roleAmount, tx.currency)}`,
          subText: null,
          amountClass: 'text-muted-foreground',
          bgClass: 'bg-muted/30',
        }
      case 'you_settled':
        return {
          label: `You paid ${tx.recipientName}`,
          icon: <ArrowUpRight size={16} className="text-red-500" />,
          amountText: formatDualCurrency(tx.roleAmount, tx.currency),
          subText: null,
          amountClass: 'text-red-600 dark:text-red-400 font-semibold',
          bgClass: 'bg-red-50 dark:bg-red-950/20',
        }
      case 'you_received':
        return {
          label: `${tx.payerName} paid you`,
          icon: <ArrowDownLeft size={16} className="text-green-500" />,
          amountText: formatDualCurrency(tx.roleAmount, tx.currency),
          subText: null,
          amountClass: 'text-green-600 dark:text-green-400 font-semibold',
          bgClass: 'bg-green-50 dark:bg-green-950/20',
        }
    }
  }

  const display = getRoleDisplay()

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${display.bgClass}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">{display.icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tx.type === 'expense' ? tx.description : display.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {tx.type === 'expense' ? display.label : tx.description}
            {' \u00B7 '}
            {formatDate(tx.date)}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 ml-3 text-right">
        <p className={`text-sm tabular-nums ${display.amountClass}`}>
          {display.amountText}
        </p>
        {display.subText && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {display.subText}
          </p>
        )}
      </div>
    </div>
  )
}
