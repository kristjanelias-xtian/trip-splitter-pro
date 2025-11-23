import { Expense } from '@/types/expense'
import { Participant, Family } from '@/types/participant'

export interface ParticipantBalance {
  id: string
  name: string
  totalPaid: number
  totalShare: number
  balance: number
  isFamily: boolean
}

export interface BalanceCalculation {
  balances: ParticipantBalance[]
  totalExpenses: number
  suggestedNextPayer: ParticipantBalance | null
}

/**
 * Calculate balances for all participants/families based on expenses
 *
 * @param expenses - All expenses for the trip
 * @param participants - All participants in the trip
 * @param families - All families in the trip (if in families mode)
 * @param trackingMode - 'individuals' or 'families'
 * @returns Balance calculation with suggested next payer
 */
export function calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families'
): BalanceCalculation {
  const balances = new Map<string, ParticipantBalance>()

  // Initialize balances for all entities
  if (trackingMode === 'families') {
    families.forEach(family => {
      balances.set(family.id, {
        id: family.id,
        name: family.family_name,
        totalPaid: 0,
        totalShare: 0,
        balance: 0,
        isFamily: true,
      })
    })
  } else {
    participants.forEach(participant => {
      balances.set(participant.id, {
        id: participant.id,
        name: participant.name,
        totalPaid: 0,
        totalShare: 0,
        balance: 0,
        isFamily: false,
      })
    })
  }

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Process each expense
  expenses.forEach(expense => {
    // Add to payer's totalPaid
    const payerId = getPaidById(expense, participants, trackingMode)
    if (payerId && balances.has(payerId)) {
      const payer = balances.get(payerId)!
      payer.totalPaid += expense.amount
    }

    // Calculate shares based on distribution
    const shares = calculateExpenseShares(expense, participants, families, trackingMode)

    // Add to each participant's/family's totalShare
    shares.forEach((share, entityId) => {
      if (balances.has(entityId)) {
        const entity = balances.get(entityId)!
        entity.totalShare += share
      }
    })
  })

  // Calculate final balances (positive = owed money, negative = owes money)
  balances.forEach(balance => {
    balance.balance = balance.totalPaid - balance.totalShare
  })

  // Find suggested next payer (person furthest behind their share)
  const suggestedNextPayer = findSuggestedPayer(Array.from(balances.values()))

  return {
    balances: Array.from(balances.values()).sort((a, b) => b.balance - a.balance),
    totalExpenses,
    suggestedNextPayer,
  }
}

/**
 * Get the ID of the entity that should be credited for paying
 * In families mode, get the family ID of the payer
 * In individuals mode, get the participant ID
 */
function getPaidById(
  expense: Expense,
  participants: Participant[],
  trackingMode: 'individuals' | 'families'
): string | null {
  const payer = participants.find(p => p.id === expense.paid_by)
  if (!payer) return null

  if (trackingMode === 'families' && payer.family_id) {
    return payer.family_id
  }

  return payer.id
}

/**
 * Calculate how much each entity owes for a specific expense
 * Returns a map of entity ID -> amount owed
 */
function calculateExpenseShares(
  expense: Expense,
  participants: Participant[],
  _families: Family[],
  trackingMode: 'individuals' | 'families'
): Map<string, number> {
  const shares = new Map<string, number>()
  const distribution = expense.distribution

  if (distribution.type === 'individuals') {
    // Split evenly among listed individuals
    const shareCount = distribution.participants.length
    const shareAmount = expense.amount / shareCount

    distribution.participants.forEach(participantId => {
      if (trackingMode === 'families') {
        // Find the family of this participant
        const participant = participants.find(p => p.id === participantId)
        const familyId = participant?.family_id
        if (familyId) {
          const currentShare = shares.get(familyId) || 0
          shares.set(familyId, currentShare + shareAmount)
        }
      } else {
        shares.set(participantId, shareAmount)
      }
    })
  } else if (distribution.type === 'families') {
    // Split evenly among listed families
    const shareCount = distribution.families.length
    const shareAmount = expense.amount / shareCount

    distribution.families.forEach(familyId => {
      shares.set(familyId, shareAmount)
    })
  } else if (distribution.type === 'mixed') {
    // Mixed distribution: some families, some individuals
    const totalShares = distribution.families.length + distribution.participants.length
    const shareAmount = expense.amount / totalShares

    distribution.families.forEach(familyId => {
      shares.set(familyId, shareAmount)
    })

    distribution.participants.forEach(participantId => {
      if (trackingMode === 'families') {
        const participant = participants.find(p => p.id === participantId)
        const familyId = participant?.family_id
        if (familyId) {
          const currentShare = shares.get(familyId) || 0
          shares.set(familyId, currentShare + shareAmount)
        }
      } else {
        shares.set(participantId, shareAmount)
      }
    })
  }

  return shares
}

/**
 * Find the participant/family who should pay next
 * This is the entity with the most negative balance (owes the most relative to what they've paid)
 */
function findSuggestedPayer(balances: ParticipantBalance[]): ParticipantBalance | null {
  if (balances.length === 0) return null

  // Find the entity with the lowest balance (most negative = furthest behind)
  return balances.reduce((suggested, current) => {
    if (current.balance < suggested.balance) {
      return current
    }
    return suggested
  })
}

/**
 * Get balance for a specific participant or family
 */
export function getBalanceForEntity(
  entityId: string,
  balances: ParticipantBalance[]
): ParticipantBalance | null {
  return balances.find(b => b.id === entityId) || null
}

/**
 * Format balance as string with color coding
 */
export function formatBalance(balance: number, currency: string = 'EUR'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(Math.abs(balance))

  if (balance > 0) {
    return `+${formatted}` // Owed money
  } else if (balance < 0) {
    return `-${formatted}` // Owes money
  } else {
    return formatted // Settled
  }
}

/**
 * Get color class for balance (for Tailwind CSS)
 */
export function getBalanceColorClass(balance: number): string {
  if (balance > 0) {
    return 'text-green-600 dark:text-green-400' // Owed money
  } else if (balance < 0) {
    return 'text-red-600 dark:text-red-400' // Owes money
  } else {
    return 'text-gray-600 dark:text-gray-400' // Settled
  }
}
