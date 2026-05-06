// SPDX-License-Identifier: Apache-2.0
import type { ExtractedItem, MappedItem, LegacyMappedItem } from '@/types/receipt'
import type { Allocations } from './receiptDistribution'

/** Returns items with guaranteed `id`. Legacy items get `legacy-<index>` ids. */
export function ensureItemIds(items: ExtractedItem[]): Array<ExtractedItem & { id: string }> {
  return items.map((item, i) => ({
    ...item,
    id: item.id ?? `legacy-${i}`,
  }))
}

function isLegacy(entry: MappedItem | LegacyMappedItem): entry is LegacyMappedItem {
  return typeof (entry as LegacyMappedItem).item_index === 'number'
    && Array.isArray((entry as LegacyMappedItem).participant_ids)
}

/**
 * Normalize the saved `mapped_items` blob (which may contain a mix of new and legacy
 * shapes) against the current items list.
 *
 * Legacy entries are converted by index lookup (using ensureItemIds), with each
 * participant getting a count of 1 (the old expanded-row model).
 *
 * Entries whose item_index is out of range are silently dropped.
 */
export function normalizeMappedItems(
  raw: (MappedItem | LegacyMappedItem)[],
  items: ExtractedItem[]
): MappedItem[] {
  const ensured = ensureItemIds(items)
  const out: MappedItem[] = []
  for (const entry of raw) {
    if (isLegacy(entry)) {
      const target = ensured[entry.item_index]
      if (!target) continue
      out.push({
        itemId: target.id,
        participantCounts: entry.participant_ids.map(pid => ({ participantId: pid, count: 1 })),
      })
    } else {
      out.push(entry)
    }
  }
  return out
}

/** Convert MappedItem[] to in-memory Allocations map. */
export function mappedItemsToAllocations(mapped: MappedItem[]): Allocations {
  const out: Allocations = new Map()
  for (const m of mapped) {
    const inner = new Map<string, number>()
    for (const pc of m.participantCounts) {
      if (pc.count > 0) inner.set(pc.participantId, pc.count)
    }
    if (inner.size > 0) out.set(m.itemId, inner)
  }
  return out
}

/** Convert Allocations map back to MappedItem[] for persistence. */
export function allocationsToMappedItems(allocations: Allocations): MappedItem[] {
  const out: MappedItem[] = []
  for (const [itemId, inner] of allocations) {
    const participantCounts = Array.from(inner.entries())
      .filter(([, count]) => count > 0)
      .map(([participantId, count]) => ({ participantId, count }))
    if (participantCounts.length === 0) continue
    out.push({ itemId, participantCounts })
  }
  return out
}
