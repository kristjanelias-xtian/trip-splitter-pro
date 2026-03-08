// SPDX-License-Identifier: Apache-2.0
/**
 * ResponsiveOverlay — renders AppSheet on mobile, Dialog on desktop.
 *
 * Use this for every overlay that appears on both viewports.
 * Mobile always gets a bottom sheet (project standard).
 * Desktop gets a centered dialog with identical header structure.
 */

import { ReactNode, RefObject } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { AppSheet } from '@/components/ui/AppSheet'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ResponsiveOverlayProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** true → 92dvh + keyboard hooks (mobile), false → 75dvh fixed (mobile). Default false. */
  hasInputs?: boolean
  /** Desktop dialog max-width class. Default 'max-w-lg'. */
  maxWidth?: string
  /** Sticky footer rendered below scroll area on both mobile and desktop. */
  footer?: ReactNode
  /** Show back arrow (left slot) instead of spacer. */
  onBack?: () => void
  /** Extra header content below the title row (e.g. description, progress bar). */
  headerExtra?: ReactNode
  /** Prevent closing when clicking outside. */
  preventOutsideClose?: boolean
  /** External ref for the scroll container (e.g. for useIOSScrollFix + useScrollIntoView). */
  scrollRef?: RefObject<HTMLDivElement>
  /** Override the scroll container className. Default: 'px-4 py-4'. */
  scrollClassName?: string
  children: ReactNode
}

function OverlayButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
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

export function ResponsiveOverlay({
  open,
  onClose,
  title,
  hasInputs = false,
  maxWidth = 'max-w-lg',
  footer,
  onBack,
  headerExtra,
  preventOutsideClose = false,
  scrollRef: externalScrollRef,
  scrollClassName,
  children,
}: ResponsiveOverlayProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const internalScrollRef = useIOSScrollFix()
  const scrollRef = externalScrollRef ?? internalScrollRef

  // Mobile: delegate to AppSheet (single source of truth for sheets)
  if (isMobile) {
    return (
      <AppSheet
        open={open}
        onClose={onClose}
        title={title}
        height={hasInputs ? '92dvh' : '75dvh'}
        hasInputs={hasInputs}
        footer={footer}
        onBack={onBack}
        headerExtra={headerExtra}
        preventOutsideClose={preventOutsideClose}
        scrollRef={externalScrollRef}
        scrollClassName={scrollClassName}
      >
        {children}
      </AppSheet>
    )
  }

  // Desktop: centered Dialog with identical header structure
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent
        hideClose
        className={`${maxWidth} max-h-[85vh] flex flex-col p-0 gap-0`}
        onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
      >
        {/* STICKY HEADER — matches AppSheet structure */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          {onBack ? (
            <OverlayButton onClick={onBack} label="Go back">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </OverlayButton>
          ) : (
            <div className="w-8" />
          )}
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <OverlayButton onClick={onClose} label="Close">
            <X className="w-4 h-4 text-muted-foreground" />
          </OverlayButton>
        </div>

        {headerExtra && (
          <div className="shrink-0">{headerExtra}</div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-contain ${scrollClassName ?? 'px-4 py-4'}`}>
          {children}
        </div>

        {/* STICKY FOOTER */}
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
