// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import type { WalletTransaction } from '../types'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { supabase } from '@/lib/supabase'
import { Wallet, Receipt, X, ChevronDown, ChevronRight } from 'lucide-react'
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

type ListEntry =
  | { kind: 'single'; tx: WalletTransaction }
  | { kind: 'group'; groupKey: string; vendor: string | null; total: number; date: string; receiptImagePath: string | null; items: WalletTransaction[] }

function buildGroupedList(transactions: WalletTransaction[]): ListEntry[] {
  // Pre-compute how many transactions share each grouping key
  const keyCounts = new Map<string, number>()
  for (const tx of transactions) {
    const key = tx.receipt_batch_id ?? tx.receipt_image_path
    if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
  }

  const batchMap = new Map<string, WalletTransaction[]>()
  const ungrouped: WalletTransaction[] = []

  for (const tx of transactions) {
    const key = tx.receipt_batch_id ?? tx.receipt_image_path
    if (key && (keyCounts.get(key) ?? 0) > 1) {
      const existing = batchMap.get(key)
      if (existing) {
        existing.push(tx)
      } else {
        batchMap.set(key, [tx])
      }
    } else {
      ungrouped.push(tx)
    }
  }

  const entries: ListEntry[] = []

  // Merge groups and singles in chronological order (newest first)
  // Use earliest transaction date as group date for sorting
  const groupEntries: ListEntry[] = []
  for (const [groupKey, items] of batchMap) {
    const sortedItems = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const total = items.reduce((sum, tx) => sum + tx.amount, 0)
    const vendor = items[0].vendor
    const receiptImagePath = items.find(tx => tx.receipt_image_path)?.receipt_image_path ?? null
    groupEntries.push({
      kind: 'group',
      groupKey,
      vendor,
      total,
      date: items[0].created_at,
      receiptImagePath,
      items: sortedItems,
    })
  }

  const singleEntries: ListEntry[] = ungrouped.map(tx => ({ kind: 'single', tx }))

  // Merge and sort by date descending
  entries.push(...groupEntries, ...singleEntries)
  entries.sort((a, b) => {
    const dateA = a.kind === 'single' ? a.tx.created_at : a.date
    const dateB = b.kind === 'single' ? b.tx.created_at : b.date
    return dateB.localeCompare(dateA)
  })

  return entries
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const grouped = buildGroupedList(transactions)
    return limit ? grouped.slice(0, limit) : grouped
  }, [transactions, limit])

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Tehinguid pole veel
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {entries.map(entry => {
          if (entry.kind === 'single') {
            const tx = entry.tx
            return (
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
            )
          }

          // Receipt group
          const isExpanded = expandedGroups.has(entry.groupKey)
          return (
            <li key={entry.groupKey} className="py-1">
              {/* Group header */}
              <div
                className="flex items-center gap-3 py-3 px-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => toggleGroup(entry.groupKey)}
              >
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-muted">
                  <Receipt size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.vendor || 'Kviitung'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {relativeDate(entry.date)}
                    <span className="text-muted-foreground/60">·</span>
                    {entry.items.length} kirjet
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    -{formatAmount(entry.total)}
                  </span>
                  {isExpanded
                    ? <ChevronDown size={16} className="text-muted-foreground" />
                    : <ChevronRight size={16} className="text-muted-foreground" />
                  }
                </div>
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div className="ml-4 border-l-2 border-border pl-3 mb-2">
                  {entry.items.map(tx => (
                    <div key={tx.id} className="flex items-center gap-2 py-1.5">
                      <span className="text-sm shrink-0">{getCategoryEmoji(tx.category!)}</span>
                      <p className="text-sm truncate flex-1 text-muted-foreground">{tx.description || 'Kulu'}</p>
                      <span className="text-sm tabular-nums text-muted-foreground">{formatAmount(tx.amount)}</span>
                    </div>
                  ))}
                  {entry.receiptImagePath && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReceiptUrl(getReceiptUrl(entry.receiptImagePath!))
                      }}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1 mb-1"
                    >
                      <Receipt size={12} />
                      Vaata kviitungit
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Receipt image viewer */}
      <Sheet open={!!receiptUrl} onOpenChange={(open) => { if (!open) setReceiptUrl(null) }}>
        <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '75dvh' }}>
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
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
