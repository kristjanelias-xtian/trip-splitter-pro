import { useNavigate } from 'react-router-dom'
import { Plus, ScanLine, X } from 'lucide-react'
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
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
      >
        {/* Sticky header — never scrolls */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <ScanLine size={20} />
              Scan a Receipt
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground px-4 pb-3">Which group is this for?</p>
        </div>

        {/* Scrollable group list */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
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
