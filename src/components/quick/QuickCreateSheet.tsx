import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
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
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
          bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined,
        }}
      >
        {/* Sticky header — never scrolls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <SheetTitle className="text-base font-semibold">Create New</SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content — only this scrolls */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <EventForm
            onSubmit={handleCreate}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
