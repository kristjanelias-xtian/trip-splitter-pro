import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Trip } from '@/types/trip'
import type { Expense } from '@/types/expense'
import type { ParticipantBalance } from '@/services/balanceCalculator'
import type { OptimalSettlementPlan } from '@/services/settlementOptimizer'
import type { Participant } from '@/types/participant'

/**
 * Export settlement plan to PDF
 */
export function exportSettlementPlanToPDF(
  trip: Trip,
  optimization: OptimalSettlementPlan,
  balances: ParticipantBalance[]
): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Settlement Plan', 14, 20)

  // Trip Info
  doc.setFontSize(12)
  doc.text(`Trip: ${trip.name}`, 14, 30)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36)

  // Summary Stats
  doc.setFontSize(14)
  doc.text('Summary', 14, 48)

  const totalToSettle = balances
    .filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0)

  doc.setFontSize(10)
  doc.text(`Total Amount to Settle: €${totalToSettle.toFixed(2)}`, 14, 56)
  doc.text(`Transactions Required: ${optimization.totalTransactions}`, 14, 62)

  if (optimization.totalTransactions === 0) {
    doc.setFontSize(12)
    doc.setTextColor(34, 139, 34) // Green
    doc.text('✓ All balances are settled!', 14, 74)
    doc.save(`settlement-plan-${trip.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    return
  }

  // Settlement Transactions Table
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Required Payments', 14, 74)

  autoTable(doc, {
    startY: 80,
    head: [['#', 'From', 'To', 'Amount']],
    body: optimization.transactions.map((tx: any, index: number) => [
      (index + 1).toString(),
      tx.fromName,
      tx.toName,
      `€${tx.amount.toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [231, 111, 81] }, // Coral color
    margin: { left: 14, right: 14 },
  })

  // Current Balances Table
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Current Balances', 14, finalY)

  // Sort balances: positive first (owed money), then negative (owes money)
  const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance)

  autoTable(doc, {
    startY: finalY + 6,
    head: [['Participant/Family', 'Total Paid', 'Total Share', 'Balance', 'Status']],
    body: sortedBalances.map(b => [
      b.name,
      `€${b.totalPaid.toFixed(2)}`,
      `€${b.totalShare.toFixed(2)}`,
      `€${Math.abs(b.balance).toFixed(2)}`,
      b.balance > 0 ? 'Owed' : b.balance < 0 ? 'Owes' : 'Settled'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [106, 153, 78] }, // Sage color
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      // Color code the status column
      if (data.column.index === 4 && data.section === 'body') {
        const balance = balances[data.row.index].balance
        if (balance > 0) {
          data.cell.styles.textColor = [34, 139, 34] // Green
        } else if (balance < 0) {
          data.cell.styles.textColor = [220, 53, 69] // Red
        }
      }
    }
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  doc.save(`settlement-plan-${trip.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

/**
 * Export trip summary to PDF (expenses overview)
 */
export function exportTripSummaryToPDF(
  trip: Trip,
  expenses: Expense[],
  participants: Participant[],
  balances: ParticipantBalance[]
): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Trip Summary', 14, 20)

  // Trip Info
  doc.setFontSize(12)
  doc.text(`${trip.name}`, 14, 30)
  doc.setFontSize(10)
  if (trip.start_date && trip.end_date) {
    doc.text(
      `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`,
      14,
      36
    )
  }
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42)

  // Summary Stats
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  doc.setFontSize(14)
  doc.text('Overview', 14, 54)

  doc.setFontSize(10)
  doc.text(`Total Expenses: €${totalExpenses.toFixed(2)}`, 14, 62)
  doc.text(`Number of Expenses: ${expenses.length}`, 14, 68)
  doc.text(`Participants: ${participants.length}`, 14, 74)

  // Expenses by Category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0
    }
    acc[expense.category] += expense.amount
    return acc
  }, {} as Record<string, number>)

  doc.setFontSize(14)
  doc.text('Expenses by Category', 14, 86)

  autoTable(doc, {
    startY: 92,
    head: [['Category', 'Total', 'Percentage']],
    body: Object.entries(expensesByCategory).map(([category, amount]) => [
      category,
      `€${amount.toFixed(2)}`,
      `${((amount / totalExpenses) * 100).toFixed(1)}%`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [244, 162, 97] }, // Gold color
    margin: { left: 14, right: 14 },
  })

  // Top 10 Expenses
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Top Expenses', 14, finalY)

  autoTable(doc, {
    startY: finalY + 6,
    head: [['Description', 'Paid By', 'Category', 'Amount']],
    body: topExpenses.map(e => {
      const payer = participants.find(p => p.id === e.paid_by)
      return [
        e.description,
        payer?.name || 'Unknown',
        e.category,
        `€${e.amount.toFixed(2)}`
      ]
    }),
    theme: 'grid',
    headStyles: { fillColor: [231, 111, 81] }, // Coral color
    margin: { left: 14, right: 14 },
  })

  // Add new page for balances if needed
  if ((doc as any).lastAutoTable.finalY > doc.internal.pageSize.height - 80) {
    doc.addPage()
  }

  // Current Balances
  const balancesY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Current Balances', 14, balancesY)

  const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance)

  autoTable(doc, {
    startY: balancesY + 6,
    head: [['Participant/Family', 'Total Paid', 'Total Share', 'Balance']],
    body: sortedBalances.map(b => [
      b.name,
      `€${b.totalPaid.toFixed(2)}`,
      `€${b.totalShare.toFixed(2)}`,
      `${b.balance > 0 ? '+' : ''}€${b.balance.toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [106, 153, 78] }, // Sage color
    margin: { left: 14, right: 14 },
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  doc.save(`trip-summary-${trip.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

/**
 * Export detailed expense list to PDF
 */
export function exportExpenseListToPDF(
  trip: Trip,
  expenses: Expense[],
  participants: Participant[]
): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Expense Details', 14, 20)

  // Trip Info
  doc.setFontSize(12)
  doc.text(`${trip.name}`, 14, 30)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36)
  doc.text(`Total Expenses: ${expenses.length}`, 14, 42)

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
  )

  // Expenses Table
  doc.setFontSize(14)
  doc.text('All Expenses', 14, 54)

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Description', 'Paid By', 'Category', 'Amount']],
    body: sortedExpenses.map(e => {
      const payer = participants.find(p => p.id === e.paid_by)
      return [
        new Date(e.expense_date).toLocaleDateString(),
        e.description.length > 30 ? e.description.substring(0, 30) + '...' : e.description,
        payer?.name || 'Unknown',
        e.category,
        `€${e.amount.toFixed(2)}`
      ]
    }),
    theme: 'grid',
    headStyles: { fillColor: [231, 111, 81] }, // Coral color
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  doc.save(`expenses-${trip.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
