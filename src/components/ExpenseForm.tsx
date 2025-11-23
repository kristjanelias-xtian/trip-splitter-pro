import { useState, useEffect, FormEvent } from 'react'
import { CreateExpenseInput, ExpenseCategory, ExpenseDistribution } from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateExpenseInput>
  submitLabel?: string
}

const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Accommodation',
  'Transport',
  'Activities',
  'Training',
  'Other',
]

export function ExpenseForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = 'Add Expense',
}: ExpenseFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, families, getAdultParticipants } = useParticipantContext()

  const [description, setDescription] = useState(initialValues?.description || '')
  const [amount, setAmount] = useState(initialValues?.amount?.toString() || '')
  const [currency, setCurrency] = useState(initialValues?.currency || 'EUR')
  const [paidBy, setPaidBy] = useState(initialValues?.paid_by || '')
  const [category, setCategory] = useState<ExpenseCategory>(initialValues?.category || 'Food')
  const [expenseDate, setExpenseDate] = useState(
    initialValues?.expense_date || new Date().toISOString().split('T')[0]
  )
  const [comment, setComment] = useState(initialValues?.comment || '')
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  // Distribution state
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])

  const [loading, setLoading] = useState(false)

  const adults = getAdultParticipants()
  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Auto-select all participants/families on mount if not editing
  useEffect(() => {
    if (!initialValues && participants.length > 0 && selectedParticipants.length === 0) {
      setSelectedParticipants(participants.map(p => p.id))
    }
    if (!initialValues && families.length > 0 && selectedFamilies.length === 0) {
      setSelectedFamilies(families.map(f => f.id))
    }
  }, [participants, families])

  const handleParticipantToggle = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleFamilyToggle = (id: string) => {
    setSelectedFamilies(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      alert('Please enter a description')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }

    if (!paidBy) {
      alert('Please select who paid')
      return
    }

    // Validate distribution
    if (isIndividualsMode) {
      if (selectedParticipants.length === 0) {
        alert('Please select at least one person to split between')
        return
      }
    } else {
      if (selectedFamilies.length === 0 && selectedParticipants.length === 0) {
        alert('Please select at least one family or person to split between')
        return
      }
    }

    // Build distribution object
    let distribution: ExpenseDistribution
    if (isIndividualsMode) {
      distribution = {
        type: 'individuals',
        participants: selectedParticipants,
      }
    } else {
      // Families mode
      if (selectedFamilies.length > 0 && selectedParticipants.length > 0) {
        distribution = {
          type: 'mixed',
          families: selectedFamilies,
          participants: selectedParticipants,
        }
      } else if (selectedFamilies.length > 0) {
        distribution = {
          type: 'families',
          families: selectedFamilies,
        }
      } else {
        distribution = {
          type: 'individuals',
          participants: selectedParticipants,
        }
      }
    }

    if (!currentTrip) {
      alert('No trip selected')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        trip_id: currentTrip.id,
        description: description.trim(),
        amount: amountNum,
        currency,
        paid_by: paidBy,
        distribution,
        category,
        expense_date: expenseDate,
        comment: comment.trim() || undefined,
      })

      // Reset form
      setDescription('')
      setAmount('')
      setComment('')
      setSelectedParticipants(participants.map(p => p.id))
      setSelectedFamilies(families.map(f => f.id))
      setShowMoreDetails(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="e.g., Dinner at restaurant"
          required
          disabled={loading}
        />
      </div>

      {/* Amount - Large mobile input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 px-4 py-3 text-2xl border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            disabled={loading}
          />
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={loading}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      {/* Who Paid */}
      <div>
        <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Who Paid?
        </label>
        <select
          id="paidBy"
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          required
          disabled={loading}
        >
          <option value="">Select person...</option>
          {adults.map(adult => (
            <option key={adult.id} value={adult.id}>
              {adult.name}
            </option>
          ))}
        </select>
      </div>

      {/* Split Between */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Split Between
        </label>

        {isIndividualsMode ? (
          // Individuals mode - show participants
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
            {participants.map(participant => (
              <label key={participant.id} className="flex items-center min-h-[44px]">
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(participant.id)}
                  onChange={() => handleParticipantToggle(participant.id)}
                  className="mr-3 h-5 w-5"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {participant.name} {participant.is_adult ? '' : '(child)'}
                </span>
              </label>
            ))}
          </div>
        ) : (
          // Families mode - show families and individuals
          <div className="space-y-3">
            {families.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Families</p>
                <div className="space-y-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {families.map(family => (
                    <label key={family.id} className="flex items-center min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={selectedFamilies.includes(family.id)}
                        onChange={() => handleFamilyToggle(family.id)}
                        className="mr-3 h-5 w-5"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {family.family_name} ({family.adults} adults
                        {family.children > 0 && `, ${family.children} children`})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {participants.filter(p => !p.family_id).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Individual Participants</p>
                <div className="space-y-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {participants
                    .filter(p => !p.family_id)
                    .map(participant => (
                      <label key={participant.id} className="flex items-center min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participant.id)}
                          onChange={() => handleParticipantToggle(participant.id)}
                          className="mr-3 h-5 w-5"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {participant.name} {participant.is_adult ? '' : '(child)'}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* More Details Collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          className="text-sm text-neutral hover:underline"
          disabled={loading}
        >
          {showMoreDetails ? '▼ Less details' : '▶ More details'}
        </button>

        {showMoreDetails && (
          <div className="mt-3 space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {/* Date */}
            <div>
              <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                id="expenseDate"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comment (optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
                rows={2}
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-neutral text-white px-4 py-3 rounded-lg hover:bg-neutral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
