// SPDX-License-Identifier: Apache-2.0
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTripContext } from '@/contexts/TripContext'
import { EventForm } from '@/components/EventForm'
import { CreateEventInput } from '@/types/trip'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface QuickCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateSheet({ open, onOpenChange }: QuickCreateSheetProps) {
  const navigate = useNavigate()
  const { createTrip } = useTripContext()
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const handleCreate = async (input: CreateEventInput) => {
    const newEvent = await createTrip(input)
    if (newEvent) {
      onOpenChange(false)
      navigate(isMobile ? `/t/${newEvent.trip_code}/quick` : `/t/${newEvent.trip_code}/manage`)
    }
  }

  const closeBtn = (
    <button
      onClick={() => onOpenChange(false)}
      aria-label="Close"
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      <X className="w-4 h-4 text-muted-foreground" />
    </button>
  )

  const scrollContent = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
      <EventForm
        onSubmit={handleCreate}
        onCancel={() => onOpenChange(false)}
      />
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex flex-col p-0 rounded-t-2xl"
          style={{
            height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
            ...(keyboard.isVisible && {
              top: `${keyboard.viewportOffset}px`,
              bottom: 'auto',
            }),
          }}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">Create New</SheetTitle>
            {closeBtn}
          </div>
          {scrollContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="flex flex-col max-h-[85vh] max-w-lg p-0 gap-0">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <DialogTitle className="text-base font-semibold">Create New</DialogTitle>
          {closeBtn}
        </div>
        {scrollContent}
      </DialogContent>
    </Dialog>
  )
}
