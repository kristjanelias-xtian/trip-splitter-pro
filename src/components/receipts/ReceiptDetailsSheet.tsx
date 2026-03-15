// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScanLine, ChevronDown, ChevronUp, Image, Pencil } from 'lucide-react'
import { ReceiptTask } from '@/types/receipt'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'

interface ReceiptDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: ReceiptTask
  canReprocess?: boolean
  onReprocess?: () => void
}

export function ReceiptDetailsSheet({ open, onOpenChange, task, canReprocess, onReprocess }: ReceiptDetailsSheetProps) {
  const { t } = useTranslation()
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

  const footer = canReprocess && onReprocess ? (
    <Button
      onClick={onReprocess}
      variant="outline"
      className="w-full gap-2"
    >
      <Pencil size={16} />
      {t('receipt.editMapping')}
    </Button>
  ) : undefined

  return (
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={<span className="flex items-center gap-2 min-w-0"><ScanLine size={18} className="shrink-0" /><span className="truncate">{t('receipt.receiptDetails')}{task.extracted_merchant ? ` — ${task.extracted_merchant}` : ''}</span></span>}
      maxWidth="max-w-2xl"
      footer={footer}
      scrollClassName=""
    >
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
                {t('receipt.receiptPhoto')}
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
          <p className="text-sm text-muted-foreground text-center py-6">{t('receipt.noItemsExtracted')}</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
              <span>{t('common.item')}</span>
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
            <span>{t('common.total')}</span>
            <span className="tabular-nums">{currency} {task.extracted_total.toFixed(2)}</span>
          </div>
        )}
      </div>
    </ResponsiveOverlay>
  )
}
