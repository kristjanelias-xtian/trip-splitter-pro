// SPDX-License-Identifier: Apache-2.0
import type { IndividualsDistribution } from '@/types/expense'

export interface DistributableItem {
  id: string
  price: number
  qty: number
}

/** Per-item allocation: itemId -> participantId -> count */
export type Allocations = Map<string, Map<string, number>>

export function pricePerUnit(item: { price: number; qty: number }): number {
  if (item.qty <= 0) return 0
  return item.price / item.qty
}

/**
 * Assign an equal share weight (1) to every participant.
 * Counts are per-item share weights, not capped unit allocations, so an
 * item is always split proportionally across whoever shares it. Giving
 * everyone a weight of 1 means "split this item equally" regardless of qty
 * (so a single shared pizza splits across the whole table).
 * Returns Map<participantId, weight> with only positive entries.
 */
export function distributeEvenly(participantIds: string[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const id of participantIds) result.set(id, 1)
  return result
}

/**
 * A participant's cost share of one item: their weight as a fraction of the
 * item's total weight, times the item price. Returns 0 when nobody shares it.
 */
export function itemShare(price: number, weight: number, sumWeights: number): number {
  if (sumWeights <= 0 || weight <= 0) return 0
  return (price * weight) / sumWeights
}

export function totalAssigned(perParticipant: Map<string, number>): number {
  let sum = 0
  for (const v of perParticipant.values()) sum += v
  return sum
}

export interface BuildDistributionInput {
  items: DistributableItem[]
  allocations: Allocations
  confirmedTotal: number
  tipAmount: number
}

export interface BuildDistributionResult {
  distribution: IndividualsDistribution
  totalAmount: number
}

/**
 * Translate per-item allocations into an IndividualsDistribution split,
 * scaling raw shares to confirmedTotal and distributing tip equally
 * across all involved participants.
 */
export function buildReceiptDistribution({
  items,
  allocations,
  confirmedTotal,
  tipAmount,
}: BuildDistributionInput): BuildDistributionResult {
  const rawShares: Record<string, number> = {}

  for (const item of items) {
    const perPersonMap = allocations.get(item.id)
    if (!perPersonMap || perPersonMap.size === 0 || item.price === 0) continue
    const sumWeights = totalAssigned(perPersonMap)
    for (const [pid, weight] of perPersonMap) {
      if (weight <= 0) continue
      rawShares[pid] = (rawShares[pid] ?? 0) + itemShare(item.price, weight, sumWeights)
    }
  }

  const includedIds = Object.keys(rawShares)
  if (includedIds.length === 0) {
    return {
      distribution: { type: 'individuals', participants: [], splitMode: 'amount', participantSplits: [] },
      totalAmount: confirmedTotal + tipAmount,
    }
  }

  const rawTotal = Object.values(rawShares).reduce((a, b) => a + b, 0)
  const scaleFactor = rawTotal > 0 ? confirmedTotal / rawTotal : 1

  const participantSplits = includedIds.map(pid => ({
    participantId: pid,
    value: Math.round(rawShares[pid] * scaleFactor * 100) / 100,
  }))

  // Fix rounding on last participant so the sum equals confirmedTotal exactly
  const sumScaled = participantSplits.reduce((a, b) => a + b.value, 0)
  const roundingAdj = Math.round((confirmedTotal - sumScaled) * 100) / 100
  participantSplits[participantSplits.length - 1].value += roundingAdj

  const totalAmount = confirmedTotal + tipAmount
  if (tipAmount > 0) {
    const tipPerPerson = Math.round((tipAmount / includedIds.length) * 100) / 100
    for (const split of participantSplits) {
      split.value = Math.round((split.value + tipPerPerson) * 100) / 100
    }
    const sumWithTip = participantSplits.reduce((a, b) => a + b.value, 0)
    const tipAdj = Math.round((totalAmount - sumWithTip) * 100) / 100
    participantSplits[participantSplits.length - 1].value += tipAdj
  }

  return {
    distribution: {
      type: 'individuals',
      participants: includedIds,
      splitMode: 'amount',
      participantSplits,
    },
    totalAmount,
  }
}
