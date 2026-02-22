import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { EventForm } from '@/components/EventForm'
import { CreateEventInput } from '@/types/trip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface QuickCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateSheet({ open, onOpenChange }: QuickCreateSheetProps) {
  const navigate = useNavigate()
  const { createTrip } = useTripContext()

  const handleCreate = async (input: CreateEventInput) => {
    const newEvent = await createTrip(input)
    if (newEvent) {
      onOpenChange(false)
      navigate(`/t/${newEvent.trip_code}/quick`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Create New</SheetTitle>
        </SheetHeader>
        <EventForm
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
