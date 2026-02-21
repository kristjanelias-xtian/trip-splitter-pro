import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScanLine, ChevronDown, ChevronUp, Image } from 'lucide-react'
import { ReceiptTask } from '@/types/receipt'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface ReceiptDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: ReceiptTask
}

export function ReceiptDetailsSheet({ open, onOpenChange, task }: ReceiptDetailsSheetProps) {
  const items = task.extracted_items ?? []
  const currency = task.extracted_currency ?? '—'

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ScanLine size={18} />
              Receipt{task.extracted_merchant ? ` — ${task.extracted_merchant}` : ''}
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
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
                    <span className="break-words">{item.name}</span>
                    <span className="text-center text-muted-foreground">{item.qty}</span>
                    <span className="text-right tabular-nums">{currency} {item.price.toFixed(2)}</span>
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
      </SheetContent>
    </Sheet>
  )
}
