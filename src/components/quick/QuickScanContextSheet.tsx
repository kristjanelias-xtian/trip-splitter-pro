import { useNavigate } from 'react-router-dom'
import { Plus, ScanLine } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Event } from '@/types/trip'

interface QuickScanContextSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trips: Event[]
  onNewGroup: () => void
}

export function QuickScanContextSheet({
  open,
  onOpenChange,
  trips,
  onNewGroup,
}: QuickScanContextSheetProps) {
  const navigate = useNavigate()

  const handleSelectTrip = (tripCode: string) => {
    onOpenChange(false)
    navigate(`/t/${tripCode}/quick`, { state: { openScan: true } })
  }

  const handleNewGroup = () => {
    onOpenChange(false)
    onNewGroup()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
      >
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ScanLine size={20} />
            Scan a Receipt
          </SheetTitle>
          <p className="text-sm text-muted-foreground mt-0.5">Which group is this for?</p>
        </div>

        {/* Scrollable group list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {trips.map(trip => (
            <button
              key={trip.id}
              onClick={() => handleSelectTrip(trip.trip_code)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/40 transition-colors"
            >
              <span className="font-medium text-foreground">{trip.name}</span>
            </button>
          ))}

          {/* New Group option */}
          <Button
            variant="outline"
            className="w-full gap-2 mt-1"
            onClick={handleNewGroup}
          >
            <Plus size={16} />
            New Group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
