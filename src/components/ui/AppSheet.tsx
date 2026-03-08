// SPDX-License-Identifier: Apache-2.0
/**
 * SHEET STANDARD — DO NOT DEVIATE
 *
 * AppSheet is the single source of truth for all bottom sheets
 * in this app. Every sheet must either use this component or
 * manually implement the identical structure documented here.
 *
 * Rules:
 * - Height: always h-[Xdvh] — never vh, never h-screen
 * - Header: shrink-0, never scrolls, always visible
 * - Content: flex-1 overflow-y-auto (overscroll-contain applied by useIOSScrollFix)
 * - Footer/CTA: shrink-0, never scrolls, always visible
 * - Close button: rounded-full w-8 h-8 border border-border
 *   with X w-4 h-4 — identical on every sheet, no exceptions
 * - One dismiss affordance: ✕ closes, ← goes back (not both)
 * - useKeyboardHeight on all sheets with inputs
 * - dvh + flex shrink-0 ensures header never moves on keyboard open
 *
 * When adding a new sheet: use AppSheet.
 * Never build a new sheet structure from scratch.
 * Last audited: 2026-02-24
 */

import { ReactNode, RefObject } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'

interface AppSheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  height?: '92dvh' | '75dvh'
  footer?: ReactNode
  onBack?: () => void
  hasInputs?: boolean
  children: ReactNode
  /** Extra content rendered after the title row inside the sticky header (e.g. progress bar, description) */
  headerExtra?: ReactNode
  /** Prevent closing when clicking outside (e.g. during submission) */
  preventOutsideClose?: boolean
  /** External ref for the scroll container — overrides internal useIOSScrollFix ref */
  scrollRef?: RefObject<HTMLDivElement>
  /** Override the scroll container className. Default: 'px-4 py-4'. */
  scrollClassName?: string
}

function SheetButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      {children}
    </button>
  )
}

export function AppSheet({
  open,
  onClose,
  title,
  height = '92dvh',
  footer,
  onBack,
  hasInputs = false,
  children,
  headerExtra,
  preventOutsideClose = false,
  scrollRef: externalScrollRef,
  scrollClassName,
}: AppSheetProps) {
  const keyboard = hasInputs ? useKeyboardHeight() : null
  const internalScrollRef = useIOSScrollFix()
  const scrollRef = externalScrollRef ?? internalScrollRef

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard?.isVisible ? `${keyboard.availableHeight}px` : height,
          ...(keyboard?.isVisible && {
            top: `${keyboard.viewportOffset}px`,
            bottom: 'auto',
          }),
        }}
        onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
      >
        {/* STICKY HEADER — never scrolls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          {onBack ? (
            <SheetButton onClick={onBack} label="Go back">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </SheetButton>
          ) : (
            <div className="w-8" />
          )}
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetButton onClick={onClose} label="Close">
            <X className="w-4 h-4 text-muted-foreground" />
          </SheetButton>
        </div>

        {headerExtra && (
          <div className="shrink-0">{headerExtra}</div>
        )}

        {/* SCROLLABLE CONTENT — only this scrolls */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto ${scrollClassName ?? 'px-4 py-4'}`}>
          {children}
        </div>

        {/* STICKY FOOTER — never scrolls */}
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background pwa-safe-bottom">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
