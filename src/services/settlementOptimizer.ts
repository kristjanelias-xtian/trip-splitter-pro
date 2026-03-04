import { ParticipantBalance } from './balanceCalculator'

export interface SettlementTransaction {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
  fromIsFamily: boolean
  toIsFamily: boolean
}

export interface OptimalSettlementPlan {
  transactions: SettlementTransaction[]
  totalTransactions: number
  currency: string
}

export type SettlementMode = 'optimal' | 'greedy'

/**
 * Greedy settlement: match largest debtor with largest creditor repeatedly.
 * Produces at most n-1 transactions.
 */
function settleGreedy(nonZero: ParticipantBalance[]): SettlementTransaction[] {
  const working = nonZero.map(b => ({ ...b, balance: b.balance }))
  const transactions: SettlementTransaction[] = []

  const getDebtors = () =>
    working
      .filter(b => b.balance < -0.01)
      .sort((a, b) => a.balance - b.balance)

  const getCreditors = () =>
    working
      .filter(b => b.balance > 0.01)
      .sort((a, b) => b.balance - a.balance)

  let debtors = getDebtors()
  let creditors = getCreditors()

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0]
    const creditor = creditors[0]
    const transactionAmount = Math.min(Math.abs(debtor.balance), creditor.balance)

    transactions.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      amount: Math.round(transactionAmount * 100) / 100,
      fromIsFamily: debtor.isFamily,
      toIsFamily: creditor.isFamily,
    })

    debtor.balance += transactionAmount
    creditor.balance -= transactionAmount

    debtors = getDebtors()
    creditors = getCreditors()
  }

  return transactions
}

/**
 * Find the optimal partition of participants into independent zero-sum subsets.
 * Uses bitmask DP: dp[mask] = max number of zero-sum subsets that partition mask.
 * Returns array of index arrays, one per subset.
 *
 * Falls back to single group (greedy) if n > 20 or DP fails.
 */
function findOptimalPartition(balances: number[]): number[][] {
  const n = balances.length
  if (n <= 1 || n > 20) {
    return [Array.from({ length: n }, (_, i) => i)]
  }

  const full = (1 << n) - 1

  // Precompute subset sums
  const subsetSum = new Float64Array(1 << n)
  for (let mask = 1; mask <= full; mask++) {
    // Use lowest set bit to build incrementally
    const lsb = mask & -mask
    const lsbIdx = 31 - Math.clz32(lsb)
    subsetSum[mask] = subsetSum[mask ^ lsb] + balances[lsbIdx]
  }

  // dp[mask] = max zero-sum subsets partitioning mask. -1 = not reachable.
  const dp = new Int32Array(1 << n).fill(-1)
  const parent = new Int32Array(1 << n).fill(0) // stores the submask chosen
  dp[0] = 0

  for (let mask = 1; mask <= full; mask++) {
    // Try every non-empty submask of mask
    let sub = mask
    while (sub > 0) {
      if (Math.abs(subsetSum[sub]) < 0.01) {
        const rest = mask ^ sub
        if (dp[rest] >= 0 && dp[rest] + 1 > dp[mask]) {
          dp[mask] = dp[rest] + 1
          parent[mask] = sub
        }
      }
      sub = (sub - 1) & mask
    }
  }

  // Fallback if DP didn't find a valid partition
  if (dp[full] < 0) {
    return [Array.from({ length: n }, (_, i) => i)]
  }

  // Reconstruct partition
  const groups: number[][] = []
  let remaining = full
  while (remaining > 0) {
    const sub = parent[remaining]
    const group: number[] = []
    let bits = sub
    while (bits > 0) {
      const lsb = bits & -bits
      group.push(31 - Math.clz32(lsb))
      bits ^= lsb
    }
    groups.push(group)
    remaining ^= sub
  }

  return groups
}

/**
 * Calculate the settlement plan.
 *
 * @param balances - Array of participant/family balances
 * @param currency - Currency for the transactions (default: 'EUR')
 * @param mode - 'optimal' (default) uses bitmask DP to find independent zero-sum
 *               subsets then settles each greedily. 'greedy' uses plain greedy.
 */
export function calculateOptimalSettlement(
  balances: ParticipantBalance[],
  currency: string = 'EUR',
  mode: SettlementMode = 'optimal'
): OptimalSettlementPlan {
  const nonZero = balances.filter(b => Math.abs(b.balance) > 0.01)

  if (nonZero.length === 0) {
    return { transactions: [], totalTransactions: 0, currency }
  }

  let transactions: SettlementTransaction[]

  if (mode === 'greedy') {
    transactions = settleGreedy(nonZero)
  } else {
    // Optimal: partition into independent zero-sum subsets, settle each
    const partition = findOptimalPartition(nonZero.map(b => b.balance))
    transactions = []
    for (const group of partition) {
      const subset = group.map(i => nonZero[i])
      transactions.push(...settleGreedy(subset))
    }
    // Sort by amount descending for consistent presentation
    transactions.sort((a, b) => b.amount - a.amount)
  }

  return {
    transactions,
    totalTransactions: transactions.length,
    currency,
  }
}

/**
 * Format a settlement transaction as a readable string
 */
export function formatSettlementTransaction(
  transaction: SettlementTransaction,
  currency: string = 'EUR'
): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(transaction.amount)

  return `${transaction.fromName} pays ${transaction.toName}: ${formattedAmount}`
}

/**
 * Check if all balances are settled (within a small tolerance)
 */
export function areBalancesSettled(balances: ParticipantBalance[]): boolean {
  return balances.every(b => Math.abs(b.balance) < 0.01)
}

/**
 * Calculate total debt amount (sum of all negative balances)
 */
export function calculateTotalDebt(balances: ParticipantBalance[]): number {
  return balances
    .filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0)
}

/**
 * Calculate total credit amount (sum of all positive balances)
 */
export function calculateTotalCredit(balances: ParticipantBalance[]): number {
  return balances
    .filter(b => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0)
}
