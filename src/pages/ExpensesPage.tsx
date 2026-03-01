import { useState, useCallback } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { Plus, Search, Receipt, FileDown, SlidersHorizontal, ScanLine, User, Tag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useAuth } from '@/contexts/AuthContext'
import { calculateBalances, convertToBaseCurrency } from '@/services/balanceCalculator'
import { exportExpensesToExcel } from '@/services/excelExport'
import { ExpenseWizard } from '@/components/expenses/ExpenseWizard'
import { ExpenseCard } from '@/components/ExpenseCard'
import { PendingReceiptBanner, ReceiptReviewData } from '@/components/receipts/PendingReceiptBanner'
import { ReceiptCaptureSheet } from '@/components/receipts/ReceiptCaptureSheet'
import { ReceiptReviewSheet } from '@/components/receipts/ReceiptReviewSheet'
import { ReceiptDetailsSheet } from '@/components/receipts/ReceiptDetailsSheet'
import { ReceiptTask } from '@/types/receipt'
import { CreateExpenseInput, ExpenseCategory, Expense } from '@/types/expense'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ExpensesPage() {
  const { currentTrip } = useCurrentTrip()
  const { expenses, loading, error, createExpense, updateExpense, deleteExpense, refreshExpenses } = useExpenseContext()
  const { participants } = useParticipantContext()
  const { settlements } = useSettlementContext()
  const { pendingReceipts, receiptByExpenseId, dismissReceiptTask } = useReceiptContext()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleRefresh = useCallback(() => refreshExpenses(), [refreshExpenses])
  useRegisterRefresh(handleRefresh)

  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')
  const [selectedPaidBy, setSelectedPaidBy] = useState<string | 'all'>('all')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [showReceiptCapture, setShowReceiptCapture] = useState(false)
  const [receiptReviewData, setReceiptReviewData] = useState<ReceiptReviewData | null>(null)
  const [viewingReceiptTask, setViewingReceiptTask] = useState<ReceiptTask | null>(null)
  const [retrying, setRetrying] = useState(false)

  const handleCreateExpense = async (input: CreateExpenseInput) => {
    await createExpense(input)
    setShowForm(false)
  }

  const handleUpdateExpense = async (input: CreateExpenseInput) => {
    if (!editingExpense) return
    await updateExpense(editingExpense.id, input)
    setEditingExpense(null)
  }

  const handleDeleteExpense = async () => {
    if (deletingExpenseId) {
      await deleteExpense(deletingExpenseId)
      setDeletingExpenseId(null)
    }
  }

  const handleExportExcel = () => {
    if (!currentTrip) return

    const balances = calculateBalances(
      expenses,
      participants,
      currentTrip.tracking_mode,
      settlements,
      currentTrip.default_currency,
      currentTrip.exchange_rates
    ).balances

    exportExpensesToExcel(currentTrip, expenses, participants, balances, settlements)
  }

  const handleReprocessReceipt = (task: ReceiptTask) => {
    setViewingReceiptTask(null)
    setReceiptReviewData({
      taskId: task.id,
      merchant: task.extracted_merchant,
      items: task.extracted_items ?? [],
      total: task.extracted_total,
      currency: task.extracted_currency ?? currentTrip?.default_currency ?? 'EUR',
      imagePath: task.receipt_image_path ?? null,
      category: task.extracted_category ?? null,
      existingExpenseId: task.expense_id ?? undefined,
      mappedItems: task.mapped_items,
    })
  }

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedPaidBy !== 'all'
  const showFilters = filtersVisible || hasActiveFilters

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    // Filter by category
    if (selectedCategory !== 'all' && expense.category !== selectedCategory) {
      return false
    }

    // Filter by paid by
    if (selectedPaidBy !== 'all' && expense.paid_by !== selectedPaidBy) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesDescription = expense.description.toLowerCase().includes(query)
      const matchesComment = expense.comment?.toLowerCase().includes(query)
      if (!matchesDescription && !matchesComment) {
        return false
      }
    }

    return true
  })

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Please select a trip to manage expenses
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <h2 className="text-xl font-bold text-foreground">Expenses</h2>
          <div className="flex items-center gap-1.5">
            {expenses.length > 0 && (
              <Button onClick={handleExportExcel} variant="ghost" size="icon" title="Export Excel">
                <FileDown size={18} />
              </Button>
            )}
            <div className="relative">
              <Button
                onClick={() => setFiltersVisible(v => !v)}
                variant={hasActiveFilters ? 'secondary' : 'ghost'}
                size="icon"
                title="Toggle filters"
              >
                <SlidersHorizontal size={18} />
              </Button>
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary pointer-events-none" />
              )}
            </div>
            <Button onClick={() => setShowReceiptCapture(true)} variant="ghost" size="icon" title="Scan receipt">
              <ScanLine size={18} />
            </Button>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus size={16} className="mr-2" />
              {showForm ? 'Cancel' : 'Add Expense'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <PageErrorState error={error} onRetry={async () => {
            setRetrying(true)
            try { await refreshExpenses() } finally { setRetrying(false) }
          }} retrying={retrying} />
        )}

        {/* Pending receipts banner */}
        <PendingReceiptBanner
          tasks={pendingReceipts}
          defaultCurrency={currentTrip?.default_currency ?? 'USD'}
          onReview={setReceiptReviewData}
          onDismiss={dismissReceiptTask}
        />

        {/* Add/Edit Expense Wizard */}
        <ExpenseWizard
          open={showForm || !!editingExpense}
          onOpenChange={(open) => {
            if (!open) {
              setShowForm(false)
              setEditingExpense(null)
            }
          }}
          onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
          initialValues={editingExpense ? {
            trip_id: editingExpense.trip_id,
            description: editingExpense.description,
            amount: editingExpense.amount,
            currency: editingExpense.currency,
            paid_by: editingExpense.paid_by,
            distribution: editingExpense.distribution,
            category: editingExpense.category,
            expense_date: editingExpense.expense_date,
            comment: editingExpense.comment ?? undefined,
          } : undefined}
          mode={editingExpense ? 'edit' : 'create'}
        />

        {/* Filters — shown only when toggled or when a filter is active */}
        {showFilters && <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="flex items-center gap-2">
                  <Search size={14} />
                  Search
                </Label>
                <Input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search expenses..."
                />
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Tag size={14} />
                  Category
                </Label>
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ExpenseCategory | 'all')}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Accommodation">Accommodation</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Activities">Activities</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paid By Filter */}
              <div className="space-y-2">
                <Label htmlFor="paid-by" className="flex items-center gap-2">
                  <User size={14} />
                  Paid by
                </Label>
                <Select value={selectedPaidBy} onValueChange={setSelectedPaidBy}>
                  <SelectTrigger id="paid-by">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    {participants
                      .filter(p => p.is_adult)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* Expense List */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <PageLoadingState />
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  {expenses.length === 0
                    ? 'No expenses yet. Add your first expense to get started!'
                    : 'No expenses match your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredExpenses.length} of {expenses.length} expenses
                  </p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    Total: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: currentTrip.default_currency,
                    }).format(filteredExpenses.reduce((sum, exp) => sum + convertToBaseCurrency(exp.amount, exp.currency, currentTrip.default_currency, currentTrip.exchange_rates), 0))}
                  </p>
                </div>
                {filteredExpenses.map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={() => {
                      setShowForm(false)
                      setEditingExpense(expense)
                    }}
                    onDelete={() => setDeletingExpenseId(expense.id)}
                    onViewReceipt={receiptByExpenseId[expense.id]
                      ? () => setViewingReceiptTask(receiptByExpenseId[expense.id])
                      : undefined
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Capture */}
      {currentTrip && (
        <ReceiptCaptureSheet
          open={showReceiptCapture}
          onOpenChange={setShowReceiptCapture}
          tripId={currentTrip.id}
          onScanned={(_taskId) => {
            setShowReceiptCapture(false)
            toast({ title: 'Receipt scanned', description: 'Review it using the banner above.' })
          }}
        />
      )}

      {/* Receipt Review */}
      {receiptReviewData && (
        <ReceiptReviewSheet
          open={!!receiptReviewData}
          onOpenChange={open => { if (!open) setReceiptReviewData(null) }}
          taskId={receiptReviewData.taskId}
          merchant={receiptReviewData.merchant}
          items={receiptReviewData.items}
          extractedTotal={receiptReviewData.total}
          currency={receiptReviewData.currency}
          imagePath={receiptReviewData.imagePath}
          extractedCategory={receiptReviewData.category}
          existingExpenseId={receiptReviewData.existingExpenseId}
          mappedItems={receiptReviewData.mappedItems}
          onDone={() => setReceiptReviewData(null)}
        />
      )}

      {/* Receipt Details (read-only) */}
      {viewingReceiptTask && (
        <ReceiptDetailsSheet
          open={!!viewingReceiptTask}
          onOpenChange={open => { if (!open) setViewingReceiptTask(null) }}
          task={viewingReceiptTask}
          canReprocess={!!user}
          onReprocess={() => handleReprocessReceipt(viewingReceiptTask)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExpenseId} onOpenChange={(open) => !open && setDeletingExpenseId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeletingExpenseId(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteExpense} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
