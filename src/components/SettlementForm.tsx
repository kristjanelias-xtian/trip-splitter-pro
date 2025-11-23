import { useState, FormEvent } from 'react'
import { CreateSettlementInput } from '@/types/settlement'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'

interface SettlementFormProps {
  onSubmit: (input: CreateSettlementInput) => Promise<void>
  onCancel?: () => void
}

export function SettlementForm({ onSubmit, onCancel }: SettlementFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, families } = useParticipantContext()

  const [fromParticipantId, setFromParticipantId] = useState('')
  const [toParticipantId, setToParticipantId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [settlementDate, setSettlementDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Get all entities (participants or families) for selection
  const getEntities = () => {
    if (isIndividualsMode) {
      return participants.map(p => ({ id: p.id, name: p.name, isFamily: false }))
    } else {
      // In families mode, show families
      return families.map(f => ({ id: f.id, name: f.family_name, isFamily: true }))
    }
  }

  const entities = getEntities()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!fromParticipantId) {
      alert('Please select who paid')
      return
    }

    if (!toParticipantId) {
      alert('Please select who received the payment')
      return
    }

    if (fromParticipantId === toParticipantId) {
      alert('Cannot record a payment to yourself')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }

    if (!currentTrip) {
      alert('No trip selected')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        trip_id: currentTrip.id,
        from_participant_id: fromParticipantId,
        to_participant_id: toParticipantId,
        amount: amountNum,
        currency,
        settlement_date: settlementDate,
        note: note.trim() || undefined,
      })

      // Reset form
      setFromParticipantId('')
      setToParticipantId('')
      setAmount('')
      setNote('')
      setSettlementDate(new Date().toISOString().split('T')[0])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* From Participant */}
      <div>
        <label htmlFor="fromParticipant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Who Paid? (From)
        </label>
        <select
          id="fromParticipant"
          value={fromParticipantId}
          onChange={e => setFromParticipantId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          required
          disabled={loading}
        >
          <option value="">Select {isIndividualsMode ? 'person' : 'family'}...</option>
          {entities.map(entity => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </div>

      {/* To Participant */}
      <div>
        <label htmlFor="toParticipant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Who Received? (To)
        </label>
        <select
          id="toParticipant"
          value={toParticipantId}
          onChange={e => setToParticipantId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          required
          disabled={loading}
        >
          <option value="">Select {isIndividualsMode ? 'person' : 'family'}...</option>
          {entities.map(entity => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </div>

      {/* Visual Arrow Indicator */}
      {fromParticipantId && toParticipantId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium text-blue-900 dark:text-blue-200">
              {entities.find(e => e.id === fromParticipantId)?.name}
            </span>
            <span className="text-2xl text-blue-600 dark:text-blue-400">→</span>
            <span className="font-medium text-blue-900 dark:text-blue-200">
              {entities.find(e => e.id === toParticipantId)?.name}
            </span>
          </div>
        </div>
      )}

      {/* Amount */}
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

      {/* Date */}
      <div>
        <label htmlFor="settlementDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Settlement Date
        </label>
        <input
          type="date"
          id="settlementDate"
          value={settlementDate}
          onChange={e => setSettlementDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          disabled={loading}
        />
      </div>

      {/* Note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (optional)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="e.g., Paid in cash, Partial payment, etc."
          rows={2}
          disabled={loading}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Recording...' : 'Record Settlement'}
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
