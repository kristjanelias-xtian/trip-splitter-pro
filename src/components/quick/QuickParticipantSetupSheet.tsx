import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
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
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
          bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined,
        }}
      >
        {/* Sticky header — never scrolls */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle>Set up your group</SheetTitle>
          <SheetDescription className="mt-0.5">Add the people sharing costs on this trip</SheetDescription>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {currentTrip.tracking_mode === 'individuals' ? (
            <IndividualsSetup />
          ) : (
            <FamiliesSetup />
          )}
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
