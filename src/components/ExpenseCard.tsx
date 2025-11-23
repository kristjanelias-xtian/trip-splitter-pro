import { Expense } from '@/types/expense'
import { useParticipantContext } from '@/contexts/ParticipantContext'

interface ExpenseCardProps {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { participants, families } = useParticipantContext()

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
    const participant = participants.find(p => p.id === expense.paid_by)
    return participant?.name || 'Unknown'
  }

  const getDistributionText = () => {
    const dist = expense.distribution

    if (dist.type === 'individuals') {
      const names = dist.participants
        .map(id => participants.find(p => p.id === id)?.name)
        .filter(Boolean)
      if (names.length === participants.length) {
        return 'Everyone'
      }
      return names.join(', ')
    }

    if (dist.type === 'families') {
      const names = dist.families
        .map(id => families.find(f => f.id === id)?.family_name)
        .filter(Boolean)
      if (names.length === families.length) {
        return 'All families'
      }
      return names.join(', ')
    }

    if (dist.type === 'mixed') {
      const familyNames = (dist.families || [])
        .map(id => families.find(f => f.id === id)?.family_name)
        .filter(Boolean)
      const participantNames = (dist.participants || [])
        .map(id => participants.find(p => p.id === id)?.name)
        .filter(Boolean)
      return [...familyNames, ...participantNames].join(', ')
    }

    return 'Unknown'
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      Food: '🍽️',
      Accommodation: '🏠',
      Transport: '🚗',
      Activities: '🎯',
      Training: '🏋️',
      Other: '📌',
    }
    return icons[category] || '📌'
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {expense.description}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Paid by <span className="font-medium">{getPaidByName()}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Split: {getDistributionText()}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                <span>{formatDate(expense.expense_date)}</span>
                <span>•</span>
                <span>{expense.category}</span>
              </div>
              {expense.comment && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  {expense.comment}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
            {formatAmount(expense.amount, expense.currency)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-neutral hover:text-neutral-dark p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Edit expense"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="text-negative hover:text-negative-dark p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Delete expense"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
