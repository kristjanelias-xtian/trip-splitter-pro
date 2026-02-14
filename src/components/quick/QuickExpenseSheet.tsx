import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { ExpenseWizard } from '@/components/expenses/ExpenseWizard'
import { CreateExpenseInput } from '@/types/expense'
import { useToast } from '@/hooks/use-toast'

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
    const result = await createExpense(input)
    if (result) {
      toast({
        title: 'Expense added',
        description: `${input.description} - ${input.currency} ${input.amount.toFixed(2)}`,
      })
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
