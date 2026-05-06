// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReceiptTask, ExtractedItem, MappedItem, LegacyMappedItem } from '@/types/receipt'
import { useParticipantContext } from '@/contexts/ParticipantContext'

export interface ReceiptReviewData {
  taskId: string
  merchant: string | null
  items: ExtractedItem[]
  total: number | null
  currency: string
  imagePath: string | null
  category: string | null
  existingExpenseId?: string
  mappedItems?: (MappedItem | LegacyMappedItem)[] | null
}

interface PendingReceiptBannerProps {
  tasks: ReceiptTask[]
  defaultCurrency: string
  onReview: (data: ReceiptReviewData) => void
  onDismiss: (taskId: string) => void
}

export function PendingReceiptBanner({ tasks, defaultCurrency, onReview, onDismiss }: PendingReceiptBannerProps) {
  const { t } = useTranslation()
  const { participants } = useParticipantContext()
  if (tasks.length === 0) return null

  const getScannerName = (createdBy: string) => {
    const participant = participants.find(p => p.user_id === createdBy)
    return participant?.nickname || participant?.name || null
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const scannerName = getScannerName(task.created_by)
        const subtitle = [task.extracted_merchant, scannerName ? t('receipt.scannedBy', { name: scannerName }) : null].filter(Boolean).join(' · ')

        return (
          <div
            key={task.id}
            className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 min-w-0">
                <ScanLine size={16} className="shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium">{t('receipt.unreviewed')}</span>
                  {subtitle && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    onReview({
                      taskId: task.id,
                      merchant: task.extracted_merchant,
                      items: task.extracted_items ?? [],
                      total: task.extracted_total,
                      currency: task.extracted_currency ?? defaultCurrency,
                      imagePath: task.receipt_image_path ?? null,
                      category: task.extracted_category ?? null,
                      mappedItems: task.mapped_items,
                    })
                  }
                >
                  {t('receipt.review')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => onDismiss(task.id)}
                >
                  {t('common.dismiss')}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
