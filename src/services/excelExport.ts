// SPDX-License-Identifier: Apache-2.0
import * as XLSX from 'xlsx'
import i18n from '@/i18n'
import type { Trip } from '@/types/trip'
import type { Expense } from '@/types/expense'
import type { Participant } from '@/types/participant'
import type { ParticipantBalance } from '@/services/balanceCalculator'
import type { Settlement } from '@/types/settlement'

/**
 * Export detailed expenses to Excel with multiple sheets
 */
export function exportExpensesToExcel(
  trip: Trip,
  expenses: Expense[],
  participants: Participant[],
  balances: ParticipantBalance[],
  settlements: Settlement[]
): void {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Expenses
  const expensesData = expenses.map(expense => {
    const payer = participants.find(p => p.id === expense.paid_by)
    let splitWith = ''

    if (expense.distribution.type === 'individuals') {
      const names = expense.distribution.participants
        .map(id => participants.find(p => p.id === id)?.name || i18n.t('common.unknown'))
        .join(', ')
      splitWith = names
    }

    return {
      [i18n.t('common.date')]: new Date(expense.expense_date).toLocaleDateString(),
      [i18n.t('expenses.description')]: expense.description,
      [i18n.t('common.category')]: expense.category,
      [i18n.t('expenses.amount')]: expense.amount,
      [i18n.t('receipt.currency')]: expense.currency,
      [i18n.t('expenses.paidBy')]: payer?.name || i18n.t('common.unknown'),
      'Split With': splitWith,
      Comment: expense.comment || ''
    }
  })

  const expensesWorksheet = XLSX.utils.json_to_sheet(expensesData)

  // Set column widths
  expensesWorksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 30 }, // Description
    { wch: 15 }, // Category
    { wch: 10 }, // Amount
    { wch: 8 },  // Currency
    { wch: 20 }, // Paid By
    { wch: 40 }, // Split With
    { wch: 30 }, // Comment
  ]

  XLSX.utils.book_append_sheet(workbook, expensesWorksheet, i18n.t('expenses.title'))

  // Sheet 2: Balances
  const balancesData = balances.map(balance => ({
    'Participant': balance.name,
    [i18n.t('balance.totalPaid')]: balance.totalPaid,
    [i18n.t('balance.totalShare')]: balance.totalShare,
    Balance: balance.balance,
    [i18n.t('common.status')]: balance.balance > 0 ? i18n.t('balance.othersOwe') : balance.balance < 0 ? i18n.t('balance.owes') : i18n.t('balance.settled')
  }))

  const balancesWorksheet = XLSX.utils.json_to_sheet(balancesData)
  balancesWorksheet['!cols'] = [
    { wch: 25 }, // Participant
    { wch: 12 }, // Total Paid
    { wch: 12 }, // Total Share
    { wch: 12 }, // Balance
    { wch: 10 }, // Status
  ]

  XLSX.utils.book_append_sheet(workbook, balancesWorksheet, i18n.t('dashboard.currentBalances'))

  // Sheet 3: Settlements
  if (settlements.length > 0) {
    const settlementsData = settlements.map(settlement => {
      const from = participants.find(p => p.id === settlement.from_participant_id)
      const to = participants.find(p => p.id === settlement.to_participant_id)

      return {
        [i18n.t('common.date')]: new Date(settlement.settlement_date).toLocaleDateString(),
        From: from?.name || i18n.t('common.unknown'),
        To: to?.name || i18n.t('common.unknown'),
        [i18n.t('expenses.amount')]: settlement.amount,
        [i18n.t('receipt.currency')]: settlement.currency,
        Note: settlement.note || ''
      }
    })

    const settlementsWorksheet = XLSX.utils.json_to_sheet(settlementsData)
    settlementsWorksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // From
      { wch: 20 }, // To
      { wch: 10 }, // Amount
      { wch: 8 },  // Currency
      { wch: 40 }, // Note
    ]

    XLSX.utils.book_append_sheet(workbook, settlementsWorksheet, i18n.t('settlements.title'))
  }

  // Sheet 4: Summary
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0
    }
    acc[expense.category] += expense.amount
    return acc
  }, {} as Record<string, number>)

  const summaryData = [
    { Metric: 'Trip Name', Value: trip.name },
    { Metric: 'Start Date', Value: trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'N/A' },
    { Metric: 'End Date', Value: trip.end_date ? new Date(trip.end_date).toLocaleDateString() : 'N/A' },
    { Metric: 'Tracking Mode', Value: 'Individuals' },
    { Metric: '', Value: '' }, // Empty row
    { Metric: i18n.t('dashboard.totalExpenses'), Value: totalExpenses.toFixed(2) },
    { Metric: i18n.t('expenses.title'), Value: expenses.length.toString() },
    { Metric: i18n.t('manage.participants'), Value: participants.length.toString() },
    { Metric: '', Value: '' }, // Empty row
    { Metric: 'Category Breakdown', Value: '' },
    ...Object.entries(expensesByCategory).map(([category, amount]) => ({
      Metric: `  ${category}`,
      Value: amount.toFixed(2)
    }))
  ]

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
  summaryWorksheet['!cols'] = [
    { wch: 25 }, // Metric
    { wch: 20 }, // Value
  ]

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary')

  // Write file
  XLSX.writeFile(workbook, `${trip.name.replace(/\s+/g, '-').toLowerCase()}-expenses.xlsx`)
}

/**
 * Export participants to Excel
 */
export function exportParticipantsToExcel(
  trip: Trip,
  participants: Participant[],
): void {
  const workbook = XLSX.utils.book_new()

  // Participants sheet
  const hasWalletGroups = participants.some(p => !!p.wallet_group)
  const participantsData = participants.map(participant => ({
    Name: participant.name,
    'Is Adult': participant.is_adult ? 'Yes' : 'No',
    ...(hasWalletGroups && participant.wallet_group
      ? { 'Wallet Group': participant.wallet_group }
      : {}),
  }))

  const participantsWorksheet = XLSX.utils.json_to_sheet(participantsData)
  participantsWorksheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 10 }, // Is Adult
    ...(hasWalletGroups ? [{ wch: 25 }] : []) // Wallet Group
  ]

  XLSX.utils.book_append_sheet(workbook, participantsWorksheet, 'Participants')

  // Write file
  XLSX.writeFile(workbook, `${trip.name.replace(/\s+/g, '-').toLowerCase()}-participants.xlsx`)
}
