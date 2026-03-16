// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import type { WalletTransaction } from '../types'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { supabase } from '@/lib/supabase'
import { Wallet, Receipt, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

interface TransactionListProps {
  transactions: WalletTransaction[]
  limit?: number
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Täna'
  if (diffDays === 1) return 'Eile'
  if (diffDays < 7) return `${diffDays} päeva tagasi`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} nädalat tagasi`
  return `${Math.floor(diffDays / 30)} kuud tagasi`
}

function formatAmount(amount: number): string {
  return `€${amount.toFixed(2)}`
}

function getReceiptUrl(path: string): string {
  const { data } = supabase.storage.from('kopikas-receipts').getPublicUrl(path)
  return data.publicUrl
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const items = limit ? transactions.slice(0, limit) : transactions
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Tehinguid pole veel
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map(tx => (
          <li
            key={tx.id}
            className={`flex items-center gap-3 py-3 px-1 ${tx.receipt_image_path ? 'cursor-pointer hover:bg-muted/50 rounded-lg transition-colors' : ''}`}
            onClick={() => {
              if (tx.receipt_image_path) {
                setReceiptUrl(getReceiptUrl(tx.receipt_image_path))
              }
            }}
          >
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center">
              {tx.type === 'allowance'
                ? <Wallet size={18} className="text-green-500" />
                : <span className="text-lg">{getCategoryEmoji(tx.category!)}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {tx.description || (tx.type === 'allowance' ? 'Taskuraha' : 'Kulu')}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {relativeDate(tx.created_at)}
                {tx.receipt_image_path && <Receipt size={12} className="text-muted-foreground" />}
              </p>
            </div>
            <span className={`text-sm font-medium tabular-nums ${
              tx.type === 'allowance' ? 'text-green-500' : 'text-foreground'
            }`}>
              {tx.type === 'allowance' ? '+' : '-'}{formatAmount(tx.amount)}
            </span>
          </li>
        ))}
      </ul>

      {/* Receipt image viewer */}
      <Sheet open={!!receiptUrl} onOpenChange={(open) => { if (!open) setReceiptUrl(null) }}>
        <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '85dvh' }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="w-8" />
            <SheetTitle>Kviitung</SheetTitle>
            <button onClick={() => setReceiptUrl(null)} aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex items-start justify-center">
            {receiptUrl && (
              <img
                src={receiptUrl}
                alt="Kviitung"
                className="max-w-full rounded-lg"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
