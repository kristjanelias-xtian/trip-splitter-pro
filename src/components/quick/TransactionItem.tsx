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

  const isForeignCurrency = !!defaultCurrency && !!exchangeRates && tx.currency !== defaultCurrency

  const formatBaseAmount = (amount: number, currency: string) => {
    if (!isForeignCurrency) return formatAmount(amount, currency)
    const converted = convertToBaseCurrency(amount, currency, defaultCurrency!, exchangeRates!)
    return formatAmount(converted, defaultCurrency!)
  }

  const formatOriginalAmount = (amount: number, currency: string) => {
    if (!isForeignCurrency) return null
    return formatAmount(amount, currency)
  }

  const getRoleDisplay = () => {
    switch (tx.role) {
      case 'you_paid':
        return {
          label: 'You paid',
          icon: <DollarSign size={16} className="text-primary" />,
          prefix: 'Total:',
          mainAmount: formatBaseAmount(tx.roleAmount, tx.currency),
          originalAmount: formatOriginalAmount(tx.roleAmount, tx.currency),
          subPrefix: tx.myShare !== undefined ? 'Your share:' : null,
          subAmount: tx.myShare !== undefined ? formatBaseAmount(tx.myShare, tx.currency) : null,
          subOriginal: tx.myShare !== undefined ? formatOriginalAmount(tx.myShare, tx.currency) : null,
          amountClass: 'text-foreground font-semibold',
          bgClass: 'bg-primary/5',
        }
      case 'your_share':
        return {
          label: `${tx.payerName} paid`,
          icon: <DollarSign size={16} className="text-muted-foreground" />,
          prefix: 'Your share:',
          mainAmount: formatBaseAmount(tx.roleAmount, tx.currency),
          originalAmount: formatOriginalAmount(tx.roleAmount, tx.currency),
          subPrefix: 'Total:',
          subAmount: formatBaseAmount(tx.amount, tx.currency),
          subOriginal: formatOriginalAmount(tx.amount, tx.currency),
          amountClass: 'text-muted-foreground',
          bgClass: 'bg-muted/30',
        }
      case 'you_settled':
        return {
          label: `You paid ${tx.recipientName}`,
          icon: <ArrowUpRight size={16} className="text-red-500" />,
          prefix: null,
          mainAmount: formatBaseAmount(tx.roleAmount, tx.currency),
          originalAmount: formatOriginalAmount(tx.roleAmount, tx.currency),
          subPrefix: null,
          subAmount: null,
          subOriginal: null,
          amountClass: 'text-red-600 dark:text-red-400 font-semibold',
          bgClass: 'bg-red-50 dark:bg-red-950/20',
        }
      case 'you_received':
        return {
          label: `${tx.payerName} paid you`,
          icon: <ArrowDownLeft size={16} className="text-green-500" />,
          prefix: null,
          mainAmount: formatBaseAmount(tx.roleAmount, tx.currency),
          originalAmount: formatOriginalAmount(tx.roleAmount, tx.currency),
          subPrefix: null,
          subAmount: null,
          subOriginal: null,
          amountClass: 'text-green-600 dark:text-green-400 font-semibold',
          bgClass: 'bg-green-50 dark:bg-green-950/20',
        }
    }
  }

  const display = getRoleDisplay()

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${display.bgClass}`}>
      <div className="flex-shrink-0 mt-0.5">{display.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {tx.type === 'expense' ? tx.description : display.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {tx.type === 'expense' ? display.label : tx.description}
              {' \u00B7 '}
              {formatDate(tx.date)}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className={`text-sm tabular-nums ${display.amountClass}`}>
              {display.prefix && <span className="text-xs font-normal text-muted-foreground">{display.prefix} </span>}
              {display.mainAmount}
            </p>
            {display.originalAmount && (
              <p className="text-[11px] text-muted-foreground/70 tabular-nums">{display.originalAmount}</p>
            )}
            {display.subAmount && (
              <>
                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  {display.subPrefix && <span>{display.subPrefix} </span>}
                  {display.subAmount}
                </p>
                {display.subOriginal && (
                  <p className="text-[11px] text-muted-foreground/70 tabular-nums">{display.subOriginal}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
