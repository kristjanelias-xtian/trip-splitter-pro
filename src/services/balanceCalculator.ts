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
 * Convert an amount from one currency to the trip's base currency
 */
export function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === baseCurrency) return amount
  const rate = exchangeRates[fromCurrency]
  if (!rate || rate === 0) return amount // fallback: no conversion if rate not set
  return amount / rate // e.g., 385 THB / 38.5 = 10 EUR
}

/**
 * @deprecated Use calculateBalancesV2 instead. V1 uses family UUIDs as entity IDs;
 * V2 uses wallet_group canonical participant IDs.
 *
 * Calculate balances for all participants/families based on expenses and settlements
 */
export function calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families',
  settlements: Settlement[] = [],
  defaultCurrency: string = 'EUR',
  exchangeRates: Record<string, number> = {}
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

  // Calculate total expenses (converted to base currency)
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
  }, 0)

  // Process each expense
  expenses.forEach(expense => {
    const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)

    // Add to payer's totalPaid (converted)
    const payerId = getPaidById(expense, participants, trackingMode)
    if (payerId && balances.has(payerId)) {
      const payer = balances.get(payerId)!
      payer.totalPaid += convertedAmount
    }

    // Calculate shares based on distribution (returns shares in original currency)
    const shares = calculateExpenseShares(expense, participants, families, trackingMode)

    // Add to each participant's/family's totalShare (converted to base currency)
    // Shares are proportional to expense.amount, so we need to convert them
    const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1
    shares.forEach((share, entityId) => {
      if (balances.has(entityId)) {
        const entity = balances.get(entityId)!
        entity.totalShare += share * conversionFactor
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
    const convertedAmount = convertToBaseCurrency(settlement.amount, settlement.currency, defaultCurrency, exchangeRates)

    if (fromId && balances.has(fromId)) {
      const fromEntity = balances.get(fromId)!
      fromEntity.balance += convertedAmount // They paid out cash
    }

    if (toId && balances.has(toId)) {
      const toEntity = balances.get(toId)!
      toEntity.balance -= convertedAmount // They received cash
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
 * @deprecated Use calculateExpenseSharesV2 instead. V1 keys results by
 * family UUIDs in families mode; V2 keys by wallet_group canonical participant IDs.
 */
export function calculateExpenseShares(
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
          } else {
            // Standalone participant in families mode — assign directly by participant ID
            shares.set(participantId, shareAmount)
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
          } else {
            shares.set(split.participantId, shareAmount)
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
          } else {
            shares.set(split.participantId, split.value)
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
          // In families mode, aggregate under the family ID so it matches the balance map
          const participant = participants.find(p => p.id === participantId)
          const familyId = participant?.family_id
          if (familyId) {
            const currentShare = shares.get(familyId) || 0
            shares.set(familyId, currentShare + perPersonShare)
          } else {
            shares.set(participantId, perPersonShare)
          }
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
            const participant = participants.find(p => p.id === split.participantId)
            const familyId = participant?.family_id
            if (familyId) {
              const currentShare = shares.get(familyId) || 0
              shares.set(familyId, currentShare + shareAmount)
            } else {
              shares.set(split.participantId, shareAmount)
            }
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
            const participant = participants.find(p => p.id === split.participantId)
            const familyId = participant?.family_id
            if (familyId) {
              const currentShare = shares.get(familyId) || 0
              shares.set(familyId, currentShare + split.value)
            } else {
              shares.set(split.participantId, split.value)
            }
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
    currencyDisplay: 'narrowSymbol',
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

// ─── V2 Balance Calculator (wallet_group based) ─────────────────────

interface EntityInfo {
  id: string
  name: string
  isFamily: boolean
}

export interface EntityMapResult {
  entities: EntityInfo[]
  participantToEntityId: Map<string, string>
  familyToEntityId: Map<string, string>
}

/**
 * Build entity map from wallet_group on participants.
 * In families mode: groups participants by wallet_group, standalone if null.
 * In individuals mode: each participant is a standalone entity.
 *
 * Canonical ID for a wallet_group = first adult participant sorted by name.
 */
export function buildEntityMapV2(
  participants: Participant[],
  trackingMode: 'individuals' | 'families'
): EntityMapResult {
  const entities: EntityInfo[] = []
  const participantToEntityId = new Map<string, string>()
  const familyToEntityId = new Map<string, string>()

  if (trackingMode === 'individuals') {
    for (const p of participants) {
      entities.push({ id: p.id, name: p.name, isFamily: false })
      participantToEntityId.set(p.id, p.id)
    }
  } else {
    // Group by wallet_group
    const walletGroups = new Map<string, Participant[]>()

    for (const p of participants) {
      if (p.wallet_group) {
        const group = walletGroups.get(p.wallet_group) || []
        group.push(p)
        walletGroups.set(p.wallet_group, group)
      } else {
        // Standalone participant (no wallet_group)
        entities.push({ id: p.id, name: p.name, isFamily: false })
        participantToEntityId.set(p.id, p.id)
      }
    }

    for (const [groupName, members] of walletGroups) {
      // Canonical ID: first adult member sorted alphabetically by name
      const sortedAdults = members
        .filter(m => m.is_adult)
        .sort((a, b) => a.name.localeCompare(b.name))
      const sortedAll = [...members].sort((a, b) => a.name.localeCompare(b.name))
      const canonical = sortedAdults[0] ?? sortedAll[0]

      entities.push({ id: canonical.id, name: groupName, isFamily: true })

      for (const member of members) {
        participantToEntityId.set(member.id, canonical.id)
        if (member.family_id && !familyToEntityId.has(member.family_id)) {
          familyToEntityId.set(member.family_id, canonical.id)
        }
      }
    }
  }

  return { entities, participantToEntityId, familyToEntityId }
}

/**
 * V2: Calculate how much each entity owes for a specific expense.
 * Returns a map of entity canonical ID -> amount owed.
 *
 * Uses wallet_group for entity grouping instead of family_id.
 * Handles backward-compat families/mixed distributions via families param.
 */
export function calculateExpenseSharesV2(
  expense: Expense,
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families',
  entityMap?: EntityMapResult
): Map<string, number> {
  const { participantToEntityId, familyToEntityId } =
    entityMap ?? buildEntityMapV2(participants, trackingMode)

  const shares = new Map<string, number>()
  const distribution = expense.distribution
  const splitMode = distribution.splitMode || 'equal'

  if (distribution.type === 'individuals') {
    if (splitMode === 'equal') {
      const shareAmount = expense.amount / distribution.participants.length
      for (const pid of distribution.participants) {
        const eid = participantToEntityId.get(pid) ?? pid
        shares.set(eid, (shares.get(eid) || 0) + shareAmount)
      }
    } else if (splitMode === 'percentage' && distribution.participantSplits) {
      for (const split of distribution.participantSplits) {
        const shareAmount = (expense.amount * split.value) / 100
        const eid = participantToEntityId.get(split.participantId) ?? split.participantId
        shares.set(eid, (shares.get(eid) || 0) + shareAmount)
      }
    } else if (splitMode === 'amount' && distribution.participantSplits) {
      for (const split of distribution.participantSplits) {
        const eid = participantToEntityId.get(split.participantId) ?? split.participantId
        shares.set(eid, (shares.get(eid) || 0) + split.value)
      }
    }
  } else if (distribution.type === 'families') {
    // Backward compat: use families param for size info
    if (splitMode === 'equal') {
      const shouldAccountForSize = distribution.accountForFamilySize ?? false

      if (shouldAccountForSize) {
        let totalPeople = 0
        for (const fid of distribution.families) {
          const family = families.find(f => f.id === fid)
          if (family) totalPeople += family.adults + family.children
        }
        const perPersonShare = expense.amount / totalPeople
        for (const fid of distribution.families) {
          const family = families.find(f => f.id === fid)
          if (family) {
            const eid = familyToEntityId.get(fid) ?? fid
            shares.set(eid, (shares.get(eid) || 0) + perPersonShare * (family.adults + family.children))
          }
        }
      } else {
        const shareAmount = expense.amount / distribution.families.length
        for (const fid of distribution.families) {
          const eid = familyToEntityId.get(fid) ?? fid
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      }
    } else if (splitMode === 'percentage' && distribution.familySplits) {
      for (const split of distribution.familySplits) {
        const shareAmount = (expense.amount * split.value) / 100
        const eid = familyToEntityId.get(split.familyId) ?? split.familyId
        shares.set(eid, (shares.get(eid) || 0) + shareAmount)
      }
    } else if (splitMode === 'amount' && distribution.familySplits) {
      for (const split of distribution.familySplits) {
        const eid = familyToEntityId.get(split.familyId) ?? split.familyId
        shares.set(eid, (shares.get(eid) || 0) + split.value)
      }
    }
  } else if (distribution.type === 'mixed') {
    // Filter standalone participants (not in a selected family)
    const standaloneParticipants = distribution.participants.filter(pid => {
      const p = participants.find(pp => pp.id === pid)
      if (!p) return false
      if (!p.family_id) return true
      return !distribution.families.includes(p.family_id)
    })

    if (splitMode === 'equal') {
      // Use families param for family sizes (backward compat)
      let totalPeople = standaloneParticipants.length
      for (const fid of distribution.families) {
        const family = families.find(f => f.id === fid)
        if (family) totalPeople += family.adults + family.children
      }
      const perPersonShare = expense.amount / totalPeople

      for (const fid of distribution.families) {
        const family = families.find(f => f.id === fid)
        if (family) {
          const eid = familyToEntityId.get(fid) ?? fid
          shares.set(eid, (shares.get(eid) || 0) + perPersonShare * (family.adults + family.children))
        }
      }
      for (const pid of standaloneParticipants) {
        const eid = participantToEntityId.get(pid) ?? pid
        shares.set(eid, (shares.get(eid) || 0) + perPersonShare)
      }
    } else if (splitMode === 'percentage') {
      if (distribution.familySplits) {
        for (const split of distribution.familySplits) {
          const shareAmount = (expense.amount * split.value) / 100
          const eid = familyToEntityId.get(split.familyId) ?? split.familyId
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      }
      if (distribution.participantSplits) {
        const standaloneSplits = distribution.participantSplits.filter(split => {
          const p = participants.find(pp => pp.id === split.participantId)
          if (!p) return false
          if (!p.family_id) return true
          return !distribution.families.includes(p.family_id)
        })
        for (const split of standaloneSplits) {
          const shareAmount = (expense.amount * split.value) / 100
          const eid = participantToEntityId.get(split.participantId) ?? split.participantId
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      }
    } else if (splitMode === 'amount') {
      if (distribution.familySplits) {
        for (const split of distribution.familySplits) {
          const eid = familyToEntityId.get(split.familyId) ?? split.familyId
          shares.set(eid, (shares.get(eid) || 0) + split.value)
        }
      }
      if (distribution.participantSplits) {
        const standaloneSplits = distribution.participantSplits.filter(split => {
          const p = participants.find(pp => pp.id === split.participantId)
          if (!p) return false
          if (!p.family_id) return true
          return !distribution.families.includes(p.family_id)
        })
        for (const split of standaloneSplits) {
          const eid = participantToEntityId.get(split.participantId) ?? split.participantId
          shares.set(eid, (shares.get(eid) || 0) + split.value)
        }
      }
    }
  }

  return shares
}

/**
 * V2: Calculate balances using wallet_group for entity grouping.
 *
 * Same signature as V1 calculateBalances for backward compat.
 * Entity IDs are canonical participant IDs (not family UUIDs).
 */
export function calculateBalancesV2(
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
  trackingMode: 'individuals' | 'families',
  settlements: Settlement[] = [],
  defaultCurrency: string = 'EUR',
  exchangeRates: Record<string, number> = {}
): BalanceCalculation {
  const entityMap = buildEntityMapV2(participants, trackingMode)
  const { entities, participantToEntityId } = entityMap

  // Initialize balances
  const balances = new Map<string, ParticipantBalance>()
  for (const entity of entities) {
    balances.set(entity.id, {
      id: entity.id,
      name: entity.name,
      totalPaid: 0,
      totalShare: 0,
      balance: 0,
      isFamily: entity.isFamily,
    })
  }

  // Total expenses (converted to base currency)
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
  }, 0)

  // Process each expense
  for (const expense of expenses) {
    const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)

    // Credit payer (map participant ID to entity)
    const payerEntityId = participantToEntityId.get(expense.paid_by)
    if (payerEntityId && balances.has(payerEntityId)) {
      balances.get(payerEntityId)!.totalPaid += convertedAmount
    }

    // Calculate shares
    const shares = calculateExpenseSharesV2(expense, participants, families, trackingMode, entityMap)

    // Apply shares (convert to base currency)
    const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1
    shares.forEach((share, entityId) => {
      if (balances.has(entityId)) {
        balances.get(entityId)!.totalShare += share * conversionFactor
      }
    })
  }

  // Calculate final balances
  balances.forEach(balance => {
    balance.balance = balance.totalPaid - balance.totalShare
  })

  // Apply settlements (map participant IDs to entities)
  for (const settlement of settlements) {
    const fromEntityId = participantToEntityId.get(settlement.from_participant_id)
    const toEntityId = participantToEntityId.get(settlement.to_participant_id)
    const convertedAmount = convertToBaseCurrency(settlement.amount, settlement.currency, defaultCurrency, exchangeRates)

    if (fromEntityId && balances.has(fromEntityId)) {
      balances.get(fromEntityId)!.balance += convertedAmount
    }
    if (toEntityId && balances.has(toEntityId)) {
      balances.get(toEntityId)!.balance -= convertedAmount
    }
  }

  const sortedBalances = Array.from(balances.values()).sort((a, b) => b.balance - a.balance)
  const suggestedNextPayer = findSuggestedPayer(sortedBalances)

  return {
    balances: sortedBalances,
    totalExpenses,
    suggestedNextPayer,
  }
}
