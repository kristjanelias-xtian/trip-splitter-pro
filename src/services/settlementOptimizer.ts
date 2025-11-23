import { ParticipantBalance } from './balanceCalculator'

export interface SettlementTransaction {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
  isFromFamily: boolean
  isToFamily: boolean
}

export interface OptimalSettlementPlan {
  transactions: SettlementTransaction[]
  totalTransactions: number
  currency: string
}

/**
 * Calculate the optimal settlement plan to minimize the number of transactions
 *
 * Uses a greedy algorithm:
 * 1. Create lists of debtors (negative balance) and creditors (positive balance)
 * 2. Match the largest debtor with the largest creditor
 * 3. Create a transaction for the minimum of their absolute balances
 * 4. Update balances and repeat
 *
 * @param balances - Array of participant/family balances
 * @param currency - Currency for the transactions (default: 'EUR')
 * @returns Optimal settlement plan with minimal transactions
 */
export function calculateOptimalSettlement(
  balances: ParticipantBalance[],
  currency: string = 'EUR'
): OptimalSettlementPlan {
  // Create working copies of balances
  const workingBalances = balances.map(b => ({
    ...b,
    balance: b.balance,
  }))

  const transactions: SettlementTransaction[] = []

  // Separate into debtors and creditors
  const getDebtors = () =>
    workingBalances
      .filter(b => b.balance < -0.01) // Negative balance = owes money
      .sort((a, b) => a.balance - b.balance) // Most negative first

  const getCreditors = () =>
    workingBalances
      .filter(b => b.balance > 0.01) // Positive balance = owed money
      .sort((a, b) => b.balance - a.balance) // Largest first

  let debtors = getDebtors()
  let creditors = getCreditors()

  // Continue until all debts are settled
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0]
    const creditor = creditors[0]

    // Calculate transaction amount (minimum of absolute values)
    const debtAmount = Math.abs(debtor.balance)
    const creditAmount = creditor.balance
    const transactionAmount = Math.min(debtAmount, creditAmount)

    // Create transaction
    transactions.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      amount: Math.round(transactionAmount * 100) / 100, // Round to 2 decimals
      isFromFamily: debtor.isFamily,
      isToFamily: creditor.isFamily,
    })

    // Update balances
    debtor.balance += transactionAmount
    creditor.balance -= transactionAmount

    // Refresh lists (filter out settled balances)
    debtors = getDebtors()
    creditors = getCreditors()
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
