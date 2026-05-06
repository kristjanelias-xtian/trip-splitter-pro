// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import type { ExtractedItem, MappedItem, LegacyMappedItem } from '@/types/receipt'
import { normalizeMappedItems, ensureItemIds, mappedItemsToAllocations, allocationsToMappedItems } from './mappedItemsAdapter'

const newItem = (over: Partial<ExtractedItem> = {}): ExtractedItem => ({
  id: 'item-1',
  name: 'Beer',
  nameOriginal: 'Bière',
  price: 12,
  qty: 3,
  ...over,
})

describe('ensureItemIds', () => {
  it('keeps existing ids', () => {
    const items = [newItem({ id: 'a' }), newItem({ id: 'b' })]
    const result = ensureItemIds(items)
    expect(result.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('synthesizes ids for legacy items lacking one', () => {
    const items: ExtractedItem[] = [
      { name: 'X', price: 1, qty: 1 },
      { name: 'Y', price: 2, qty: 1 },
    ]
    const result = ensureItemIds(items)
    expect(result.map(i => i.id)).toEqual(['legacy-0', 'legacy-1'])
  })

  it('mixes existing and synthesized ids by index', () => {
    const items: ExtractedItem[] = [
      { id: 'real', name: 'X', price: 1, qty: 1 },
      { name: 'Y', price: 2, qty: 1 },
    ]
    const result = ensureItemIds(items)
    expect(result.map(i => i.id)).toEqual(['real', 'legacy-1'])
  })
})

describe('normalizeMappedItems', () => {
  const items = [newItem({ id: 'a' }), newItem({ id: 'b' })]

  it('passes through new shape unchanged', () => {
    const input: MappedItem[] = [
      { itemId: 'a', participantCounts: [{ participantId: 'alice', count: 2 }] },
    ]
    const result = normalizeMappedItems(input, items)
    expect(result).toEqual(input)
  })

  it('converts legacy shape — index lookup, count: 1 per participant', () => {
    const input: LegacyMappedItem[] = [
      { item_index: 0, participant_ids: ['alice', 'bob'] },
      { item_index: 1, participant_ids: ['carol'] },
    ]
    const result = normalizeMappedItems(input, items)
    expect(result).toEqual([
      { itemId: 'a', participantCounts: [{ participantId: 'alice', count: 1 }, { participantId: 'bob', count: 1 }] },
      { itemId: 'b', participantCounts: [{ participantId: 'carol', count: 1 }] },
    ])
  })

  it('skips legacy entries whose item_index is out of range', () => {
    const input: LegacyMappedItem[] = [
      { item_index: 99, participant_ids: ['alice'] },
    ]
    const result = normalizeMappedItems(input, items)
    expect(result).toEqual([])
  })
})

describe('allocationsToMappedItems / mappedItemsToAllocations roundtrip', () => {
  it('round-trips a non-trivial allocation', () => {
    const mapped: MappedItem[] = [
      { itemId: 'a', participantCounts: [{ participantId: 'alice', count: 2 }, { participantId: 'bob', count: 1 }] },
      { itemId: 'b', participantCounts: [{ participantId: 'bob', count: 1 }] },
    ]
    const allocations = mappedItemsToAllocations(mapped)
    const back = allocationsToMappedItems(allocations)
    expect(back).toHaveLength(2)
    expect(back.find(m => m.itemId === 'a')?.participantCounts.sort((x, y) => x.participantId.localeCompare(y.participantId)))
      .toEqual([{ participantId: 'alice', count: 2 }, { participantId: 'bob', count: 1 }])
    expect(back.find(m => m.itemId === 'b')?.participantCounts).toEqual([{ participantId: 'bob', count: 1 }])
  })

  it('omits items with no positive allocations', () => {
    const allocations = new Map<string, Map<string, number>>([
      ['a', new Map([['alice', 1]])],
      ['b', new Map([['alice', 0]])], // empty after filter
    ])
    const result = allocationsToMappedItems(allocations)
    expect(result.map(m => m.itemId)).toEqual(['a'])
  })
})
