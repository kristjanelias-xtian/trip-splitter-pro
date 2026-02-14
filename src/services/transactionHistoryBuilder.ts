import { Expense } from '@/types/expense'
import { Settlement } from '@/types/settlement'
import { Participant, Family } from '@/types/participant'
import { calculateExpenseShares } from '@/services/balanceCalculator'

export interface TransactionItem {
  id: string
  type: 'expense' | 'settlement'
  date: string
  description: string
  amount: number
  currency: string
  role: 'you_paid' | 'your_share' | 'you_settled' | 'you_received'
  roleAmount: number
  myShare?: number
  payerName: string | null
  recipientName: string | null
}

/**
 * Merges expenses and settlements into a unified chronological feed
 * showing the user's role in each transaction.
 */
export function buildTransactionHistory(
  expenses: Expense[],
  settlements: Settlement[],
  participants: Participant[],
  families: Family[],
  myParticipant: Participant,
  trackingMode: 'individuals' | 'families'
): TransactionItem[] {
  const items: TransactionItem[] = []

  const getParticipantName = (id: string) =>
    participants.find(p => p.id === id)?.name || 'Unknown'

  // Determine user's entity ID (family or individual)
  const myEntityId = trackingMode === 'families' && myParticipant.family_id
    ? myParticipant.family_id
    : myParticipant.id

  // Process expenses
  for (const expense of expenses) {
    const isPayer = expense.paid_by === myParticipant.id

    // Calculate user's share
    const shares = calculateExpenseShares(expense, participants, families, trackingMode)
    const myShare = shares.get(myEntityId) || 0

    // Only include if user paid or has a share
    if (!isPayer && myShare === 0) continue

    const payerName = getParticipantName(expense.paid_by)

    if (isPayer) {
      items.push({
        id: `expense-${expense.id}`,
        type: 'expense',
        date: expense.expense_date,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        role: 'you_paid',
        roleAmount: expense.amount,
        myShare,
        payerName: null,
        recipientName: null,
      })
    } else {
      items.push({
        id: `expense-${expense.id}`,
        type: 'expense',
        date: expense.expense_date,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        role: 'your_share',
        roleAmount: myShare,
        payerName,
        recipientName: null,
      })
    }
  }

  // Process settlements
  for (const settlement of settlements) {
    const isFrom = settlement.from_participant_id === myParticipant.id
    const isTo = settlement.to_participant_id === myParticipant.id

    if (!isFrom && !isTo) continue

    if (isFrom) {
      items.push({
        id: `settlement-${settlement.id}`,
        type: 'settlement',
        date: settlement.settlement_date,
        description: settlement.note || 'Payment',
        amount: settlement.amount,
        currency: settlement.currency,
        role: 'you_settled',
        roleAmount: settlement.amount,
        payerName: null,
        recipientName: getParticipantName(settlement.to_participant_id),
      })
    } else {
      items.push({
        id: `settlement-${settlement.id}`,
        type: 'settlement',
        date: settlement.settlement_date,
        description: settlement.note || 'Payment',
        amount: settlement.amount,
        currency: settlement.currency,
        role: 'you_received',
        roleAmount: settlement.amount,
        payerName: getParticipantName(settlement.from_participant_id),
        recipientName: null,
      })
    }
  }

  // Sort by date descending (newest first)
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return items
}
