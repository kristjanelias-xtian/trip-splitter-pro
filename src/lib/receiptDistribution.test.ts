// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import {
  pricePerUnit,
  distributeEvenly,
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
    expect(distributeEvenly([], 3)).toEqual(new Map())
  })

  it('returns an empty map for qty 0', () => {
    expect(distributeEvenly(['a', 'b'], 0)).toEqual(new Map())
  })

  it('splits qty equally when divisible', () => {
    const result = distributeEvenly(['a', 'b', 'c'], 6)
    expect(result.get('a')).toBe(2)
    expect(result.get('b')).toBe(2)
    expect(result.get('c')).toBe(2)
  })

  it('lumps remainder onto the first participant id alphabetically', () => {
    // 7 / 3 = 2 remainder 1, lumped on 'a'
    const result = distributeEvenly(['c', 'a', 'b'], 7)
    expect(result.get('a')).toBe(3)
    expect(result.get('b')).toBe(2)
    expect(result.get('c')).toBe(2)
  })

  it('handles 1 unit across many participants by giving it to the alphabetical first', () => {
    const result = distributeEvenly(['z', 'a', 'm'], 1)
    expect(result.get('a')).toBe(1)
    expect(result.get('m')).toBeUndefined()
    expect(result.get('z')).toBeUndefined()
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
