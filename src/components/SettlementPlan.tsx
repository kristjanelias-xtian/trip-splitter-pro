import { OptimalSettlementPlan, SettlementTransaction } from '@/services/settlementOptimizer'

interface SettlementPlanProps {
  plan: OptimalSettlementPlan
  onRecordSettlement?: (transaction: SettlementTransaction) => void
}

export function SettlementPlan({ plan, onRecordSettlement }: SettlementPlanProps) {
  if (plan.transactions.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-1">
          All Settled!
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Everyone is squared up. No payments needed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Settlement Plan
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plan.totalTransactions} {plan.totalTransactions === 1 ? 'transaction' : 'transactions'}
        </span>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          💡 This is the optimal settlement plan with the minimum number of transactions needed to settle all balances.
        </p>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {plan.transactions.map((transaction, index) => (
          <SettlementTransactionCard
            key={index}
            transaction={transaction}
            currency={plan.currency}
            index={index + 1}
            onRecord={onRecordSettlement ? () => onRecordSettlement(transaction) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

interface SettlementTransactionCardProps {
  transaction: SettlementTransaction
  currency: string
  index: number
  onRecord?: () => void
}

function SettlementTransactionCard({
  transaction,
  currency,
  index,
  onRecord,
}: SettlementTransactionCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(transaction.amount)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Step Number */}
          <div className="flex items-center mb-2">
            <span className="flex items-center justify-center w-6 h-6 bg-neutral text-white text-xs font-bold rounded-full mr-2">
              {index}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Step {index}</span>
          </div>

          {/* Transaction Details */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-900 dark:text-white">
                {transaction.fromName}
              </span>
              {transaction.isFromFamily && (
                <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                  Family
                </span>
              )}
            </div>

            <span className="text-gray-400 dark:text-gray-600">→</span>

            <div className="flex items-center">
              <span className="font-medium text-gray-900 dark:text-white">
                {transaction.toName}
              </span>
              {transaction.isToFamily && (
                <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                  Family
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-2">
            <span className="text-2xl font-bold text-neutral">{formattedAmount}</span>
          </div>
        </div>

        {/* Record Button */}
        {onRecord && (
          <button
            onClick={onRecord}
            className="ml-4 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            ✓ Record
          </button>
        )}
      </div>
    </div>
  )
}
