import * as XLSX from 'xlsx'
import type { Trip } from '@/types/trip'
import type { Expense } from '@/types/expense'
import type { Participant, Family } from '@/types/participant'
import type { ParticipantBalance } from '@/services/balanceCalculator'
import type { Settlement } from '@/types/settlement'

/**
 * Export detailed expenses to Excel with multiple sheets
 */
export function exportExpensesToExcel(
  trip: Trip,
  expenses: Expense[],
  participants: Participant[],
  families: Family[],
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
        .map(id => participants.find(p => p.id === id)?.name || 'Unknown')
        .join(', ')
      splitWith = names
    } else if (expense.distribution.type === 'families') {
      const names = expense.distribution.families
        .map(id => families.find(f => f.id === id)?.family_name || 'Unknown')
        .join(', ')
      splitWith = names
    } else if (expense.distribution.type === 'mixed') {
      const familyNames = expense.distribution.families
        .map(id => families.find(f => f.id === id)?.family_name || 'Unknown')
      const participantNames = expense.distribution.participants
        .map(id => participants.find(p => p.id === id)?.name || 'Unknown')
      splitWith = [...familyNames, ...participantNames].join(', ')
    }

    return {
      Date: new Date(expense.expense_date).toLocaleDateString(),
      Description: expense.description,
      Category: expense.category,
      Amount: expense.amount,
      Currency: expense.currency,
      'Paid By': payer?.name || 'Unknown',
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

  XLSX.utils.book_append_sheet(workbook, expensesWorksheet, 'Expenses')

  // Sheet 2: Balances
  const balancesData = balances.map(balance => ({
    'Participant/Family': balance.name,
    'Total Paid': balance.totalPaid,
    'Total Share': balance.totalShare,
    Balance: balance.balance,
    Status: balance.balance > 0 ? 'Owed' : balance.balance < 0 ? 'Owes' : 'Settled'
  }))

  const balancesWorksheet = XLSX.utils.json_to_sheet(balancesData)
  balancesWorksheet['!cols'] = [
    { wch: 25 }, // Participant/Family
    { wch: 12 }, // Total Paid
    { wch: 12 }, // Total Share
    { wch: 12 }, // Balance
    { wch: 10 }, // Status
  ]

  XLSX.utils.book_append_sheet(workbook, balancesWorksheet, 'Balances')

  // Sheet 3: Settlements
  if (settlements.length > 0) {
    const settlementsData = settlements.map(settlement => {
      const from = participants.find(p => p.id === settlement.from_participant_id)
      const to = participants.find(p => p.id === settlement.to_participant_id)

      return {
        Date: new Date(settlement.settlement_date).toLocaleDateString(),
        From: from?.name || 'Unknown',
        To: to?.name || 'Unknown',
        Amount: settlement.amount,
        Currency: settlement.currency,
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

    XLSX.utils.book_append_sheet(workbook, settlementsWorksheet, 'Settlements')
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
    { Metric: 'Tracking Mode', Value: trip.tracking_mode === 'families' ? 'Families' : 'Individuals' },
    { Metric: '', Value: '' }, // Empty row
    { Metric: 'Total Expenses', Value: totalExpenses.toFixed(2) },
    { Metric: 'Number of Expenses', Value: expenses.length.toString() },
    { Metric: 'Participants', Value: participants.length.toString() },
    ...(trip.tracking_mode === 'families' ? [{ Metric: 'Families', Value: families.length.toString() }] : []),
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
  families: Family[]
): void {
  const workbook = XLSX.utils.book_new()

  if (trip.tracking_mode === 'families') {
    // Families sheet
    const familiesData = families.map(family => ({
      'Family Name': family.family_name,
      Adults: family.adults,
      Children: family.children,
      'Total Members': family.adults + family.children
    }))

    const familiesWorksheet = XLSX.utils.json_to_sheet(familiesData)
    familiesWorksheet['!cols'] = [
      { wch: 25 }, // Family Name
      { wch: 10 }, // Adults
      { wch: 10 }, // Children
      { wch: 15 }, // Total Members
    ]

    XLSX.utils.book_append_sheet(workbook, familiesWorksheet, 'Families')
  }

  // Participants sheet
  const participantsData = participants.map(participant => {
    const family = participant.family_id
      ? families.find(f => f.id === participant.family_id)
      : null

    return {
      Name: participant.name,
      'Is Adult': participant.is_adult ? 'Yes' : 'No',
      ...(trip.tracking_mode === 'families' ? { 'Family': family?.family_name || 'None' } : {})
    }
  })

  const participantsWorksheet = XLSX.utils.json_to_sheet(participantsData)
  participantsWorksheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 10 }, // Is Adult
    ...(trip.tracking_mode === 'families' ? [{ wch: 25 }] : []) // Family
  ]

  XLSX.utils.book_append_sheet(workbook, participantsWorksheet, 'Participants')

  // Write file
  XLSX.writeFile(workbook, `${trip.name.replace(/\s+/g, '-').toLowerCase()}-participants.xlsx`)
}
