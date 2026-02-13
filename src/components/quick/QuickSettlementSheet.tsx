import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { SettlementForm } from '@/components/SettlementForm'
import { CreateSettlementInput } from '@/types/settlement'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'

interface QuickSettlementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickSettlementSheet({ open, onOpenChange }: QuickSettlementSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { createSettlement } = useSettlementContext()
  const { toast } = useToast()

  if (!currentTrip) return null

  const handleSubmit = async (input: CreateSettlementInput) => {
    const result = await createSettlement(input)
    if (result) {
      toast({
        title: 'Payment recorded',
        description: `${input.currency} ${input.amount.toFixed(2)} payment logged`,
      })
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Log a payment</SheetTitle>
        </SheetHeader>
        <SettlementForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
