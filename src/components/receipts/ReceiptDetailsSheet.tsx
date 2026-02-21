import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScanLine } from 'lucide-react'
import { ReceiptTask } from '@/types/receipt'

interface ReceiptDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: ReceiptTask
}

export function ReceiptDetailsSheet({ open, onOpenChange, task }: ReceiptDetailsSheetProps) {
  const items = task.extracted_items ?? []
  const currency = task.extracted_currency ?? '—'

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
