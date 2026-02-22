import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface QuickParticipantSetupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickParticipantSetupSheet({ open, onOpenChange }: QuickParticipantSetupSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const keyboard = useKeyboardHeight()

  if (!currentTrip) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl overflow-y-auto"
        style={{
          height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92vh',
          bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined,
        }}
      >
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
