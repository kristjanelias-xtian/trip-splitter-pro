import { ParticipantBalance } from '@/services/balanceCalculator'
import { formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'

interface BalanceCardProps {
  balance: ParticipantBalance
  currency?: string
  onClick?: () => void
}

export function BalanceCard({ balance, currency = 'EUR', onClick }: BalanceCardProps) {
  const balanceColorClass = getBalanceColorClass(balance.balance)
  const formattedBalance = formatBalance(balance.balance, currency)
  const formattedPaid = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(balance.totalPaid)
  const formattedShare = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(balance.totalShare)

  const getBalanceStatus = () => {
    if (balance.balance > 0.01) {
      return { text: 'To receive', icon: '📥', bgClass: 'bg-green-50 dark:bg-green-900/20', borderClass: 'border-green-200 dark:border-green-800' }
    } else if (balance.balance < -0.01) {
      return { text: 'To pay', icon: '📤', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-800' }
    } else {
      return { text: 'Settled', icon: '✅', bgClass: 'bg-gray-50 dark:bg-gray-800', borderClass: 'border-gray-200 dark:border-gray-700' }
    }
  }

  const status = getBalanceStatus()

  return (
    <div
      className={`p-4 rounded-lg border ${status.borderClass} ${status.bgClass} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {balance.name}
          </h3>
          {balance.isFamily && (
            <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
              Family
            </span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{status.text}</span>
          <span className={`text-2xl font-bold ${balanceColorClass}`}>
            {formattedBalance}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Total paid:</span>
          <span className="font-medium">{formattedPaid}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Total share:</span>
          <span className="font-medium">{formattedShare}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-sm">
          <span className="mr-2">{status.icon}</span>
          <span className="text-gray-600 dark:text-gray-400">
            {Math.abs(balance.balance) < 0.01 ? (
              'All settled up!'
            ) : balance.balance > 0 ? (
              <>Others owe <strong className={balanceColorClass}>{formatBalance(balance.balance, currency)}</strong></>
            ) : (
              <>Owes <strong className={balanceColorClass}>{formatBalance(Math.abs(balance.balance), currency)}</strong></>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
