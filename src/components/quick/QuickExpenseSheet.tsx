import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { ExpenseWizard } from '@/components/expenses/ExpenseWizard'
import { CreateExpenseInput } from '@/types/expense'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface QuickExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickExpenseSheet({ open, onOpenChange }: QuickExpenseSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { myParticipant } = useMyParticipant()
  const { createExpense } = useExpenseContext()
  const { toast } = useToast()

  if (!currentTrip) return null

  // Pre-fill: payer is the current user, split among all
  const initialValues: Partial<CreateExpenseInput> = {
    trip_id: currentTrip.id,
    paid_by: myParticipant?.id || '',
    currency: currentTrip.default_currency,
    expense_date: new Date().toISOString().split('T')[0],
  }

  const handleSubmit = async (input: CreateExpenseInput) => {
    try {
      await createExpense(input)
      toast({
        title: 'Expense added',
        description: `${input.description} - ${input.currency} ${input.amount.toFixed(2)}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('QuickExpenseSheet: failed to create expense', { error: message })
      toast({
        variant: 'destructive',
        title: 'Failed to add expense',
        description: message,
      })
      throw err
    }
  }

  return (
    <ExpenseWizard
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialValues={initialValues}
    />
  )
}
