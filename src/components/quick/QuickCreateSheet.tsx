import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { EventForm } from '@/components/EventForm'
import { CreateEventInput } from '@/types/trip'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface QuickCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateSheet({ open, onOpenChange }: QuickCreateSheetProps) {
  const navigate = useNavigate()
  const { createTrip } = useTripContext()
  const keyboard = useKeyboardHeight()

  const handleCreate = async (input: CreateEventInput) => {
    const newEvent = await createTrip(input)
    if (newEvent) {
      onOpenChange(false)
      navigate(`/t/${newEvent.trip_code}/quick`)
    }
  }

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
          <SheetTitle>Create New</SheetTitle>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EventForm
            onSubmit={handleCreate}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
