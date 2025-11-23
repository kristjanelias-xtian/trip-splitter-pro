import { useState } from 'react'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useTripContext } from '@/contexts/TripContext'
import { ExpenseForm } from '@/components/ExpenseForm'
import { ExpenseCard } from '@/components/ExpenseCard'
import { CreateExpenseInput, ExpenseCategory } from '@/types/expense'

export function ExpensesPage() {
  const { currentTrip } = useTripContext()
  const { expenses, loading, error, createExpense, deleteExpense } = useExpenseContext()

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')

  const handleCreateExpense = async (input: CreateExpenseInput) => {
    const result = await createExpense(input)
    if (result) {
      setShowForm(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(id)
    }
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Please select a trip to manage expenses
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-neutral text-white px-4 py-2 rounded-lg hover:bg-neutral-dark transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-negative-light border border-negative text-negative-dark px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add New Expense
          </h3>
          <ExpenseForm onSubmit={handleCreateExpense} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as ExpenseCategory | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Food">Food</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Transport">Transport</option>
              <option value="Activities">Activities</option>
              <option value="Training">Training</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">Loading expenses...</p>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {expenses.length === 0
                ? 'No expenses yet. Add your first expense to get started!'
                : 'No expenses match your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Total: €
                {filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
              </p>
            </div>
            {filteredExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onEdit={() => {
                  // TODO: Implement edit functionality
                  alert('Edit functionality coming soon')
                }}
                onDelete={() => handleDeleteExpense(expense.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
