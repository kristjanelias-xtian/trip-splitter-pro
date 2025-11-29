import { useState } from 'react'
import { Plus, Search, Receipt, FileDown } from 'lucide-react'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { exportExpensesToExcel } from '@/services/excelExport'
import { ExpenseWizard } from '@/components/expenses/ExpenseWizard'
import { ExpenseCard } from '@/components/ExpenseCard'
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
  const { expenses, loading, error, createExpense, updateExpense, deleteExpense } = useExpenseContext()
  const { participants, families } = useParticipantContext()
  const { settlements } = useSettlementContext()

  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)

  const handleCreateExpense = async (input: CreateExpenseInput) => {
    const result = await createExpense(input)
    if (result) {
      setShowForm(false)
    }
  }

  const handleUpdateExpense = async (input: CreateExpenseInput) => {
    if (!editingExpense) return
    const result = await updateExpense(editingExpense.id, input)
    if (result) {
      setEditingExpense(null)
    }
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
      families,
      currentTrip.tracking_mode,
      settlements
    ).balances

    exportExpensesToExcel(currentTrip, expenses, participants, families, balances, settlements)
  }

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    // Filter by category
    if (selectedCategory !== 'all' && expense.category !== selectedCategory) {
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
          <div className="flex items-center gap-2">
            {expenses.length > 0 && (
              <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-2">
                <FileDown size={16} />
                Export Excel
              </Button>
            )}
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} className="mr-2" />
              {showForm ? 'Cancel' : 'Add Expense'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="category">Category</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Expense List */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading expenses...</p>
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
                    Total: €{filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
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
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
