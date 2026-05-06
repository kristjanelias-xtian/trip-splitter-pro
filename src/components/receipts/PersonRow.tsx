// SPDX-License-Identifier: Apache-2.0
import { ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react'
import type { Participant } from '@/types/participant'
import { pricePerUnit } from '@/lib/receiptDistribution'

interface PersonRowItem {
  id: string
  name: string
  nameOriginal?: string
  price: number
  qty: number
}

interface PersonRowProps {
  participant: Participant
  items: PersonRowItem[]
  /** itemId -> this participant's count */
  myCounts: Map<string, number>
  /** itemId -> participantId -> count (everyone, for "X left" math) */
  allCounts: Map<string, Map<string, number>>
  currency: string
  expanded: boolean
  onToggleExpand: () => void
  /** delta is +1 or -1; parent clamps to [0, qty]. */
  onCountChange: (itemId: string, delta: number) => void
}

export function PersonRow({
  participant,
  items,
  myCounts,
  allCounts,
  currency,
  expanded,
  onToggleExpand,
  onCountChange,
}: PersonRowProps) {
  const myTotal = items.reduce((sum, item) => {
    const c = myCounts.get(item.id) ?? 0
    return sum + c * pricePerUnit(item)
  }, 0)
  const itemCountForMe = items.filter(i => (myCounts.get(i.id) ?? 0) > 0).length

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50"
      >
        <div className="text-left">
          <div className="font-medium">{participant.name}</div>
          <div className="text-xs text-muted-foreground">{itemCountForMe} items</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{currency} {myTotal.toFixed(2)}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {items.map(item => {
            const myCount = myCounts.get(item.id) ?? 0
            const totalForItem = Array.from((allCounts.get(item.id) ?? new Map()).values()).reduce((a, b) => a + b, 0)
            const remaining = item.qty - totalForItem
            const fullyAssigned = remaining <= 0 && myCount === 0
            const canIncrement = !fullyAssigned && (totalForItem < item.qty)
            return (
              <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.name}</div>
                  {item.nameOriginal && item.nameOriginal !== item.name && (
                    <div className="text-xs italic text-muted-foreground truncate">{item.nameOriginal}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {fullyAssigned ? 'fully assigned' : `${remaining} left`}
                  </div>
                </div>
                <div className="shrink-0 inline-flex items-center gap-1.5 border border-border rounded-full px-1 py-0.5">
                  <button
                    type="button"
                    aria-label={`Decrement ${item.name} for ${participant.name}`}
                    onClick={() => onCountChange(item.id, -1)}
                    disabled={myCount === 0}
                    className="w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-accent disabled:opacity-30"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="min-w-[1.5ch] text-center tabular-nums text-sm">{myCount}</span>
                  <button
                    type="button"
                    aria-label={`Increment ${item.name} for ${participant.name}`}
                    onClick={() => onCountChange(item.id, 1)}
                    disabled={!canIncrement}
                    className="w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-accent disabled:opacity-30"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
