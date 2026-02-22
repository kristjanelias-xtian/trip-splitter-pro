import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface QuickParticipantSetupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickParticipantSetupSheet({ open, onOpenChange }: QuickParticipantSetupSheetProps) {
  const { currentTrip } = useCurrentTrip()

  if (!currentTrip) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Set up your group</SheetTitle>
          <SheetDescription>Add the people sharing costs on this trip</SheetDescription>
        </SheetHeader>
        {currentTrip.tracking_mode === 'individuals' ? (
          <IndividualsSetup />
        ) : (
          <FamiliesSetup />
        )}
        <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </SheetContent>
    </Sheet>
  )
}
