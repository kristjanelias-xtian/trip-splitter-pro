import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScanLine, ChevronDown, ChevronUp, Image, X, Pencil } from 'lucide-react'
import { ReceiptTask } from '@/types/receipt'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'

interface ReceiptDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: ReceiptTask
  canReprocess?: boolean
  onReprocess?: () => void
}

export function ReceiptDetailsSheet({ open, onOpenChange, task, canReprocess, onReprocess }: ReceiptDetailsSheetProps) {
  const items = task.extracted_items ?? []
  const currency = task.extracted_currency ?? '—'
  const isMobile = useMediaQuery('(max-width: 767px)')
  const scrollRef = useIOSScrollFix()

  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null)
  const [showThumbnail, setShowThumbnail] = useState(false)

  useEffect(() => {
    if (!open || !task.receipt_image_path) {
      setReceiptImageUrl(null)
      setShowThumbnail(false)
      return
    }
    supabase.storage
      .from('receipts')
      .createSignedUrl(task.receipt_image_path, 3600)
      .then(({ data, error }) => {
        if (error) {
          logger.warn('Failed to generate receipt image signed URL', { error: error.message })
        } else {
          setReceiptImageUrl(data.signedUrl)
        }
      })
  }, [open, task.receipt_image_path])

  const onClose = () => onOpenChange(false)

  const header = (
    <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="w-8" />
      <SheetTitle className="text-base font-semibold flex items-center gap-2 min-w-0">
        <ScanLine size={18} className="shrink-0" />
        <span className="truncate">
          Receipt{task.extracted_merchant ? ` — ${task.extracted_merchant}` : ''}
        </span>
      </SheetTitle>
      <button
        onClick={onClose}
        aria-label="Close"
        className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )

  const body = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
      <div className="px-4 py-3 space-y-3">
        {/* Receipt image thumbnail (collapsible) */}
        {receiptImageUrl && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground"
              onClick={() => setShowThumbnail(v => !v)}
            >
              <span className="flex items-center gap-1.5">
                <Image size={14} />
                Receipt photo
              </span>
              {showThumbnail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showThumbnail && (
              <img
                src={receiptImageUrl}
                alt="Receipt"
                className="w-full max-h-64 object-contain bg-muted"
              />
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No items extracted.</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                <span className="break-words min-w-0">{item.name}</span>
                <span className="text-center text-muted-foreground">{item.qty}</span>
                <span className="text-right tabular-nums whitespace-nowrap">{currency} {item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {task.extracted_total != null && (
          <div className="flex items-center justify-between font-semibold text-sm border-t border-border pt-2">
            <span>Total</span>
            <span className="tabular-nums">{currency} {task.extracted_total.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )

  const footer = canReprocess && onReprocess ? (
    <div className="shrink-0 px-4 py-3 border-t border-border bg-background pwa-safe-bottom">
      <Button
        onClick={onReprocess}
        variant="outline"
        className="w-full gap-2"
      >
        <Pencil size={16} />
        Edit mapping
      </Button>
    </div>
  ) : null

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex flex-col p-0 rounded-t-2xl"
          style={{ height: '75dvh' }}
        >
          {header}
          {body}
          {footer}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="flex flex-col max-w-2xl max-h-[85vh] p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          Receipt{task.extracted_merchant ? ` — ${task.extracted_merchant}` : ''}
        </DialogTitle>
        {header}
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  )
}
