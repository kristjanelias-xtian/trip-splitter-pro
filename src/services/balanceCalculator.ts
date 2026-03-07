import { Expense } from '@/types/expense'
import { Participant } from '@/types/participant'
import { Settlement } from '@/types/settlement'
import { buildShortNameMap } from '@/lib/participantUtils'

export interface ParticipantBalance {
  id: string
  name: string
  totalPaid: number
  totalShare: number
  totalSettled: number
  totalSettledSent: number
  totalSettledReceived: number
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

// ─── Entity Map (wallet_group based) ─────────────────────

interface EntityInfo {
  id: string
  name: string
  isFamily: boolean
}

export interface EntityMapResult {
  entities: EntityInfo[]
  participantToEntityId: Map<string, string>
}

/**
 * Build entity map from wallet_group on participants.
 * Always groups participants by wallet_group when present;
 * participants without wallet_group are standalone entities.
 *
 * Canonical ID for a wallet_group = first adult participant sorted by name.
 *
 * The trackingMode parameter is kept for API compatibility but no longer
 * affects grouping — wallet_group is always respected.
 */
export function buildEntityMap(
  participants: Participant[],
  trackingMode: 'individuals' | 'families'
): EntityMapResult {
  void trackingMode // kept for call-site compat; grouping is always wallet_group-based
  const entities: EntityInfo[] = []
  const participantToEntityId = new Map<string, string>()
  const shortNames = buildShortNameMap(participants)

  const walletGroups = new Map<string, Participant[]>()

  for (const p of participants) {
    if (p.wallet_group) {
      const group = walletGroups.get(p.wallet_group) || []
      group.push(p)
      walletGroups.set(p.wallet_group, group)
    } else {
      // Standalone participant (no wallet_group)
      entities.push({ id: p.id, name: shortNames.get(p.id) || p.name, isFamily: false })
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
    }
  }

  return { entities, participantToEntityId }
}

/**
 * Calculate how much each entity owes for a specific expense.
 * Returns a map of entity canonical ID -> amount owed.
 *
 * All distributions are type='individuals' after the family refactor.
 */
export function calculateExpenseShares(
  expense: Expense,
  participants: Participant[],
  trackingMode: 'individuals' | 'families',
  entityMap?: EntityMapResult
): Map<string, number> {
  const { participantToEntityId } =
    entityMap ?? buildEntityMap(participants, trackingMode)

  const shares = new Map<string, number>()
  const distribution = expense.distribution

  // Only individuals distributions are supported (families/mixed were migrated)
  if (distribution.type !== 'individuals') return shares

  const splitMode = distribution.splitMode || 'equal'
  const accountForFamilySize = distribution.accountForFamilySize ?? false

  if (splitMode === 'equal') {
    if (accountForFamilySize) {
      // "Split equally between groups" — each entity pays the same
      // regardless of group size.
      const entityIds = new Set<string>()
      for (const pid of distribution.participants) {
        entityIds.add(participantToEntityId.get(pid) ?? pid)
      }
      const perEntity = expense.amount / entityIds.size
      for (const eid of entityIds) {
        shares.set(eid, perEntity)
      }
    } else {
      // Default: per-person split — larger groups naturally pay more
      const shareAmount = expense.amount / distribution.participants.length
      for (const pid of distribution.participants) {
        const eid = participantToEntityId.get(pid) ?? pid
        shares.set(eid, (shares.get(eid) || 0) + shareAmount)
      }
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

  return shares
}

/**
 * Find the participant/family who should pay next
 * This is the entity with the most negative balance (owes the most relative to what they've paid)
 */
function findSuggestedPayer(balances: ParticipantBalance[]): ParticipantBalance | null {
  if (balances.length === 0) return null

  return balances.reduce((suggested, current) => {
    if (current.balance < suggested.balance) {
      return current
    }
    return suggested
  })
}

/**
 * Calculate balances using wallet_group for entity grouping.
 *
 * Entity IDs are canonical participant IDs (not family UUIDs).
 */
export function calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  trackingMode: 'individuals' | 'families',
  settlements: Settlement[] = [],
  defaultCurrency: string = 'EUR',
  exchangeRates: Record<string, number> = {}
): BalanceCalculation {
  const entityMap = buildEntityMap(participants, trackingMode)
  const { entities, participantToEntityId } = entityMap

  // Initialize balances
  const balances = new Map<string, ParticipantBalance>()
  for (const entity of entities) {
    balances.set(entity.id, {
      id: entity.id,
      name: entity.name,
      totalPaid: 0,
      totalShare: 0,
      totalSettled: 0,
      totalSettledSent: 0,
      totalSettledReceived: 0,
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
    const shares = calculateExpenseShares(expense, participants, trackingMode, entityMap)

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
    if (fromEntityId === toEntityId) continue
    const convertedAmount = convertToBaseCurrency(settlement.amount, settlement.currency, defaultCurrency, exchangeRates)

    if (fromEntityId && balances.has(fromEntityId)) {
      const fromBalance = balances.get(fromEntityId)!
      fromBalance.balance += convertedAmount
      fromBalance.totalSettled += convertedAmount
      fromBalance.totalSettledSent += convertedAmount
    }
    if (toEntityId && balances.has(toEntityId)) {
      const toBalance = balances.get(toEntityId)!
      toBalance.balance -= convertedAmount
      toBalance.totalSettled -= convertedAmount
      toBalance.totalSettledReceived += convertedAmount
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

/**
 * Calculate balances within a single wallet_group.
 * Per-member totalPaid/totalShare sum to the group-level totals from
 * calculateBalances, so the breakdown connects to the BalanceCard numbers.
 *
 * Payer is credited with the full expense amount (not just the group's share).
 * Outsider-paid expenses contribute member shares (paid=0).
 *
 * `balance = paid - share + all settlements involving at least one group member`.
 * External settlements (outsider→member or member→outsider) change each
 * member's net cash position within the family and are included.
 * Balances do NOT sum to zero — the remainder equals the family's
 * remaining external balance (already shown in the group-level BalanceCard).
 *
 * Settlements are applied to balance only (not totalPaid/totalShare).
 */
export function calculateWithinGroupBalances(
  expenses: Expense[],
  participants: Participant[],
  walletGroup: string,
  defaultCurrency: string = 'EUR',
  exchangeRates: Record<string, number> = {},
  settlements: Settlement[] = []
): ParticipantBalance[] {
  const groupMembers = participants.filter(p => p.wallet_group === walletGroup)
  if (groupMembers.length === 0) return []

  const memberIds = new Set(groupMembers.map(p => p.id))

  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  for (const m of groupMembers) {
    paid.set(m.id, 0)
    share.set(m.id, 0)
  }

  for (const expense of expenses) {
    if (expense.distribution.type !== 'individuals') continue

    const convertedAmount = convertToBaseCurrency(
      expense.amount, expense.currency, defaultCurrency, exchangeRates
    )
    const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1

    // Credit payer with the full expense amount (if they are a group member)
    const payerIsMember = memberIds.has(expense.paid_by)
    if (payerIsMember) {
      paid.set(expense.paid_by, paid.get(expense.paid_by)! + convertedAmount)
    }

    // Calculate each group member's share in this expense
    const memberShares = new Map<string, number>()
    const splitMode = expense.distribution.splitMode || 'equal'
    const accountForFamilySize = expense.distribution.accountForFamilySize ?? false

    if (splitMode === 'equal') {
      const memberParticipants = expense.distribution.participants.filter(pid => memberIds.has(pid))
      if (memberParticipants.length === 0) continue

      if (accountForFamilySize) {
        // "Split equally between groups": group's share = total / numEntities
        // Count unique entities in the distribution using wallet_group
        const entitySet = new Set<string>()
        for (const pid of expense.distribution.participants) {
          const p = participants.find(pp => pp.id === pid)
          entitySet.add(p?.wallet_group ?? pid)
        }
        const groupShare = expense.amount / entitySet.size
        // Split group's share equally among group members in distribution
        const perMember = groupShare / memberParticipants.length
        for (const pid of memberParticipants) {
          memberShares.set(pid, (memberShares.get(pid) || 0) + perMember * conversionFactor)
        }
      } else {
        // Default: per-person split
        const perPerson = expense.amount / expense.distribution.participants.length
        for (const pid of memberParticipants) {
          memberShares.set(pid, (memberShares.get(pid) || 0) + perPerson * conversionFactor)
        }
      }
    } else if ((splitMode === 'percentage' || splitMode === 'amount') && expense.distribution.participantSplits) {
      for (const split of expense.distribution.participantSplits) {
        if (!memberIds.has(split.participantId)) continue
        const splitAmount = splitMode === 'percentage'
          ? (expense.amount * split.value) / 100
          : split.value
        memberShares.set(split.participantId, (memberShares.get(split.participantId) || 0) + splitAmount * conversionFactor)
      }
    }

    // Apply shares
    memberShares.forEach((amount, pid) => {
      share.set(pid, share.get(pid)! + amount)
    })
  }

  // Compute raw balances per member: balance = paid - share
  const shortNames = buildShortNameMap(participants)
  const rawBalances = groupMembers.map(m => ({
    id: m.id,
    name: shortNames.get(m.id) || m.name,
    is_adult: m.is_adult,
    totalPaid: paid.get(m.id) || 0,
    totalShare: share.get(m.id) || 0,
    balance: (paid.get(m.id) || 0) - (share.get(m.id) || 0),
  }))

  // Apply ALL settlements involving at least one group member.
  // External settlements change a member's net cash position within the family.
  for (const settlement of settlements) {
    const fromIsMember = memberIds.has(settlement.from_participant_id)
    const toIsMember = memberIds.has(settlement.to_participant_id)
    if (!fromIsMember && !toIsMember) continue // skip outsider↔outsider

    const convertedAmount = convertToBaseCurrency(settlement.amount, settlement.currency, defaultCurrency, exchangeRates)
    if (fromIsMember) {
      const from = rawBalances.find(b => b.id === settlement.from_participant_id)
      if (from) from.balance += convertedAmount
    }
    if (toIsMember) {
      const to = rawBalances.find(b => b.id === settlement.to_participant_id)
      if (to) to.balance -= convertedAmount
    }
  }

  // Fold children's balances into adults
  const adults = rawBalances.filter(b => b.is_adult)
  const children = rawBalances.filter(b => !b.is_adult)

  if (adults.length > 0 && children.length > 0) {
    // Distribute each child's balance equally among adults
    for (const child of children) {
      const perAdult = child.balance / adults.length
      for (const adult of adults) {
        adult.balance += perAdult
        adult.totalShare += child.totalShare / adults.length
      }
    }
    // Return only adults
    return adults.map(a => ({
      id: a.id,
      name: a.name,
      totalPaid: a.totalPaid,
      totalShare: a.totalShare,
      totalSettled: 0,
      totalSettledSent: 0,
      totalSettledReceived: 0,
      balance: a.balance,
      isFamily: false,
    })).sort((a, b) => b.balance - a.balance)
  }

  // No adults or no children — return all members as-is
  const balances: ParticipantBalance[] = rawBalances.map(m => ({
    id: m.id,
    name: m.name,
    totalPaid: m.totalPaid,
    totalShare: m.totalShare,
    totalSettled: 0,
    totalSettledSent: 0,
    totalSettledReceived: 0,
    balance: m.balance,
    isFamily: false,
  }))

  return balances.sort((a, b) => b.balance - a.balance)
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
