import { X } from 'lucide-react'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { ParticipantsSetup } from '@/components/setup/ParticipantsSetup'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'

interface QuickParticipantSetupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickParticipantSetupSheet({ open, onOpenChange }: QuickParticipantSetupSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()

  if (!currentTrip) return null

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
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">Set up your group</SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <SheetDescription className="px-4 pb-3 mt-0">Add the people sharing costs on this trip</SheetDescription>
        </div>

        {/* Scrollable content — only this scrolls */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          <ParticipantsSetup />
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border bg-background pwa-safe-bottom">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
