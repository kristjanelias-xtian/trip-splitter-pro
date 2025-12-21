import { Expense } from '@/types/expense'
import { Participant, Family } from '@/types/participant'
import { Settlement } from '@/types/settlement'

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
 * Calculate balances for all participants/families based on expenses and settlements
 *
 * @param expenses - All expenses for the trip
 * @param participants - All participants in the trip
 * @param families - All families in the trip (if in families mode)
 * @param trackingMode - 'individuals' or 'families'
 * @param settlements - All settlements for the trip (optional)
 * @returns Balance calculation with suggested next payer
 */
export function calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families',
  settlements: Settlement[] = []
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

    // Also initialize balances for standalone participants (family_id is null)
    participants
      .filter(p => p.family_id === null)
      .forEach(participant => {
        balances.set(participant.id, {
          id: participant.id,
          name: participant.name,
          totalPaid: 0,
          totalShare: 0,
          balance: 0,
          isFamily: false,
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

  // Apply settlements to balances
  // When participant A pays participant B:
  // - A's balance INCREASES (they paid out cash, so they're owed more)
  // - B's balance DECREASES (they received cash, so they're owed less)
  settlements.forEach(settlement => {
    const fromId = getEntityIdForParticipant(settlement.from_participant_id, participants, trackingMode)
    const toId = getEntityIdForParticipant(settlement.to_participant_id, participants, trackingMode)

    if (fromId && balances.has(fromId)) {
      const fromEntity = balances.get(fromId)!
      fromEntity.balance += settlement.amount // They paid out cash
    }

    if (toId && balances.has(toId)) {
      const toEntity = balances.get(toId)!
      toEntity.balance -= settlement.amount // They received cash
    }
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
 * Get the entity ID for a participant
 * In families mode, returns the participant's family ID
 * In individuals mode, returns the participant ID
 */
function getEntityIdForParticipant(
  participantId: string,
  participants: Participant[],
  trackingMode: 'individuals' | 'families'
): string | null {
  const participant = participants.find(p => p.id === participantId)
  if (!participant) return null

  if (trackingMode === 'families' && participant.family_id) {
    return participant.family_id
  }

  return participant.id
}

/**
 * Calculate how much each entity owes for a specific expense
 * Returns a map of entity ID -> amount owed
 */
function calculateExpenseShares(
  expense: Expense,
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families'
): Map<string, number> {
  const shares = new Map<string, number>()
  const distribution = expense.distribution
  const splitMode = distribution.splitMode || 'equal'

  if (distribution.type === 'individuals') {
    if (splitMode === 'equal') {
      // Split evenly among listed individuals
      const shareCount = distribution.participants.length
      const shareAmount = expense.amount / shareCount

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
    } else if (splitMode === 'percentage' && distribution.participantSplits) {
      // Split by percentage
      distribution.participantSplits.forEach(split => {
        const shareAmount = (expense.amount * split.value) / 100
        if (trackingMode === 'families') {
          const participant = participants.find(p => p.id === split.participantId)
          const familyId = participant?.family_id
          if (familyId) {
            const currentShare = shares.get(familyId) || 0
            shares.set(familyId, currentShare + shareAmount)
          }
        } else {
          shares.set(split.participantId, shareAmount)
        }
      })
    } else if (splitMode === 'amount' && distribution.participantSplits) {
      // Split by custom amount
      distribution.participantSplits.forEach(split => {
        if (trackingMode === 'families') {
          const participant = participants.find(p => p.id === split.participantId)
          const familyId = participant?.family_id
          if (familyId) {
            const currentShare = shares.get(familyId) || 0
            shares.set(familyId, currentShare + split.value)
          }
        } else {
          shares.set(split.participantId, split.value)
        }
      })
    }
  } else if (distribution.type === 'families') {
    if (splitMode === 'equal') {
      // Check if we should account for family size
      // Default to false for backward compatibility (existing expenses without this field)
      const shouldAccountForSize = distribution.accountForFamilySize ?? false

      if (shouldAccountForSize) {
        // Fair per-person split: count total people across families
        let totalPeople = 0
        distribution.families.forEach(familyId => {
          const family = families.find(f => f.id === familyId)
          if (family) {
            totalPeople += family.adults + family.children
          }
        })

        const perPersonShare = expense.amount / totalPeople

        // Assign shares to families based on their size
        distribution.families.forEach(familyId => {
          const family = families.find(f => f.id === familyId)
          if (family) {
            const familySize = family.adults + family.children
            const familyShare = perPersonShare * familySize
            shares.set(familyId, familyShare)
          }
        })
      } else {
        // Families as units: split evenly among families (backward compatible behavior)
        const shareCount = distribution.families.length
        const shareAmount = expense.amount / shareCount

        distribution.families.forEach(familyId => {
          shares.set(familyId, shareAmount)
        })
      }
    } else if (splitMode === 'percentage' && distribution.familySplits) {
      // Split by percentage
      distribution.familySplits.forEach(split => {
        const shareAmount = (expense.amount * split.value) / 100
        shares.set(split.familyId, shareAmount)
      })
    } else if (splitMode === 'amount' && distribution.familySplits) {
      // Split by custom amount
      distribution.familySplits.forEach(split => {
        shares.set(split.familyId, split.value)
      })
    }
  } else if (distribution.type === 'mixed') {
    if (splitMode === 'equal') {
      // Mixed distribution: some families, some individuals
      // CRITICAL: Filter out family members from participants array to avoid double-counting
      const standaloneParticipants = distribution.participants.filter(participantId => {
        const participant = participants.find(p => p.id === participantId)
        if (!participant) return false

        // Only count if NOT in a selected family
        if (participant.family_id === null) return true
        return !distribution.families.includes(participant.family_id)
      })

      // Count total PEOPLE across families and standalone individuals
      let totalPeople = standaloneParticipants.length

      // Add up family sizes
      distribution.families.forEach(familyId => {
        const family = families.find(f => f.id === familyId)
        if (family) {
          totalPeople += family.adults + family.children
        }
      })

      // Calculate per-person share
      const perPersonShare = expense.amount / totalPeople

      // Assign shares to families based on their size
      distribution.families.forEach(familyId => {
        const family = families.find(f => f.id === familyId)
        if (family) {
          const familySize = family.adults + family.children
          const familyShare = perPersonShare * familySize
          shares.set(familyId, familyShare)
        }
      })

      // Assign per-person share to STANDALONE individuals only
      standaloneParticipants.forEach(participantId => {
        if (trackingMode === 'families') {
          shares.set(participantId, perPersonShare)
        } else {
          shares.set(participantId, perPersonShare)
        }
      })
    } else if (splitMode === 'percentage') {
      // Split by percentage for both families and participants
      if (distribution.familySplits) {
        distribution.familySplits.forEach(split => {
          const shareAmount = (expense.amount * split.value) / 100
          shares.set(split.familyId, shareAmount)
        })
      }
      if (distribution.participantSplits) {
        // CRITICAL: Filter out family members from participant splits to avoid double-counting
        const standaloneSplits = distribution.participantSplits.filter(split => {
          const participant = participants.find(p => p.id === split.participantId)
          if (!participant) return false

          // Only include if NOT in a selected family
          if (participant.family_id === null) return true
          return !distribution.families.includes(participant.family_id)
        })

        standaloneSplits.forEach(split => {
          const shareAmount = (expense.amount * split.value) / 100
          if (trackingMode === 'families') {
            shares.set(split.participantId, shareAmount)
          } else {
            shares.set(split.participantId, shareAmount)
          }
        })
      }
    } else if (splitMode === 'amount') {
      // Split by custom amount for both families and participants
      if (distribution.familySplits) {
        distribution.familySplits.forEach(split => {
          shares.set(split.familyId, split.value)
        })
      }
      if (distribution.participantSplits) {
        // CRITICAL: Filter out family members from participant splits to avoid double-counting
        const standaloneSplits = distribution.participantSplits.filter(split => {
          const participant = participants.find(p => p.id === split.participantId)
          if (!participant) return false

          // Only include if NOT in a selected family
          if (participant.family_id === null) return true
          return !distribution.families.includes(participant.family_id)
        })

        standaloneSplits.forEach(split => {
          if (trackingMode === 'families') {
            shares.set(split.participantId, split.value)
          } else {
            shares.set(split.participantId, split.value)
          }
        })
      }
    }
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
