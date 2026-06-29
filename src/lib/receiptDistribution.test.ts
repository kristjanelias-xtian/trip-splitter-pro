// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import {
  pricePerUnit,
  distributeEvenly,
  itemShare,
  totalAssigned,
  buildReceiptDistribution,
} from './receiptDistribution'

describe('pricePerUnit', () => {
  it('divides line price by qty', () => {
    expect(pricePerUnit({ price: 12, qty: 3 })).toBeCloseTo(4)
  })

  it('returns 0 when qty is 0 (avoids divide-by-zero)', () => {
    expect(pricePerUnit({ price: 12, qty: 0 })).toBe(0)
  })
})

describe('distributeEvenly', () => {
  it('returns an empty map for an empty participant set', () => {
    expect(distributeEvenly([])).toEqual(new Map())
  })

  it('assigns an equal weight of 1 to every participant', () => {
    const result = distributeEvenly(['a', 'b', 'c'])
    expect(result.get('a')).toBe(1)
    expect(result.get('b')).toBe(1)
    expect(result.get('c')).toBe(1)
  })

  it('weights everyone equally regardless of how many share (single shared item)', () => {
    // The bug fix: a qty=1 item shared by 3 must include all three, not just one.
    const result = distributeEvenly(['z', 'a', 'm'])
    expect(result.get('a')).toBe(1)
    expect(result.get('m')).toBe(1)
    expect(result.get('z')).toBe(1)
  })
})

describe('itemShare', () => {
  it('splits price by weight fraction', () => {
    expect(itemShare(10, 1, 2)).toBeCloseTo(5)
    expect(itemShare(9, 1, 3)).toBeCloseTo(3)
    expect(itemShare(12, 10, 19)).toBeCloseTo(6.3158, 3)
  })

  it('returns 0 when nobody shares or weight is 0', () => {
    expect(itemShare(10, 0, 0)).toBe(0)
    expect(itemShare(10, 0, 5)).toBe(0)
  })
})

describe('totalAssigned', () => {
  it('sums all counts in a per-participant map', () => {
    const m = new Map<string, number>([['a', 2], ['b', 1]])
    expect(totalAssigned(m)).toBe(3)
  })

  it('returns 0 for an empty map', () => {
    expect(totalAssigned(new Map())).toBe(0)
  })
})

describe('buildReceiptDistribution', () => {
  const items = [
    { id: 'i1', price: 12, qty: 3 }, // 4 each
    { id: 'i2', price: 9, qty: 1 },  // 9 to whoever gets it
  ]

  it('returns empty distribution when nothing is allocated', () => {
    const result = buildReceiptDistribution({
      items,
      allocations: new Map(),
      confirmedTotal: 21,
      tipAmount: 0,
    })
    expect(result.distribution.participantSplits ?? []).toEqual([])
    expect(result.totalAmount).toBe(21)
  })

  it('multiplies count by pricePerUnit and sums per-participant', () => {
    // alice: 2 of i1 (8) + 0 of i2; bob: 1 of i1 (4) + 1 of i2 (9) = 13
    const allocations = new Map([
      ['i1', new Map([['alice', 2], ['bob', 1]])],
      ['i2', new Map([['bob', 1]])],
    ])
    const result = buildReceiptDistribution({
      items,
      allocations,
      confirmedTotal: 21,
      tipAmount: 0,
    })

    const splits = result.distribution.participantSplits!
    const aliceSplit = splits.find(s => s.participantId === 'alice')
    const bobSplit = splits.find(s => s.participantId === 'bob')
    expect(aliceSplit?.value).toBeCloseTo(8, 2)
    expect(bobSplit?.value).toBeCloseTo(13, 2)
    expect(result.totalAmount).toBe(21)
  })

  it('scales shares to confirmedTotal when items dont sum exactly', () => {
    // raw = 21, confirmedTotal = 23.10 (10% off, e.g. tax) -- split scales proportionally
    const allocations = new Map([
      ['i1', new Map([['alice', 3]])],
      ['i2', new Map([['bob', 1]])],
    ])
    const result = buildReceiptDistribution({
      items,
      allocations,
      confirmedTotal: 23.10,
      tipAmount: 0,
    })
    // alice raw 12 -> 13.20; bob raw 9 -> 9.90; sum = 23.10
    const splits = result.distribution.participantSplits!
    const aliceSplit = splits.find(s => s.participantId === 'alice')
    const bobSplit = splits.find(s => s.participantId === 'bob')
    expect(aliceSplit!.value + bobSplit!.value).toBeCloseTo(23.10, 2)
  })

  it('splits a shared qty=1 item proportionally in a MIXED receipt', () => {
    // i1 (qty=1, price 10) shared by alice+bob -> 5 each.
    // i2 (qty=1, price 9) to bob alone -> 9.
    // Desired: alice 5, bob 14. confirmedTotal already equals raw (19).
    const mixedItems = [
      { id: 'i1', price: 10, qty: 1 },
      { id: 'i2', price: 9, qty: 1 },
    ]
    const allocations = new Map([
      ['i1', new Map([['alice', 1], ['bob', 1]])],
      ['i2', new Map([['bob', 1]])],
    ])
    const result = buildReceiptDistribution({
      items: mixedItems,
      allocations,
      confirmedTotal: 19,
      tipAmount: 0,
    })
    const splits = result.distribution.participantSplits!
    expect(splits.find(s => s.participantId === 'alice')?.value).toBeCloseTo(5, 2)
    expect(splits.find(s => s.participantId === 'bob')?.value).toBeCloseTo(14, 2)
  })

  it('adds tip equally across involved participants', () => {
    const allocations = new Map([
      ['i1', new Map([['alice', 3]])],
      ['i2', new Map([['bob', 1]])],
    ])
    const result = buildReceiptDistribution({
      items,
      allocations,
      confirmedTotal: 21,
      tipAmount: 4,
    })
    expect(result.totalAmount).toBe(25)
    const splits = result.distribution.participantSplits!
    const sum = splits.reduce((a, s) => a + s.value, 0)
    expect(sum).toBeCloseTo(25, 2)
  })
})
