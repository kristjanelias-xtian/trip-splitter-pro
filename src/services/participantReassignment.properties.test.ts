// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { applyPlan } from './participantReassignment'
import type { Snapshot, ReassignmentPlan } from './participantReassignment'
import { calculateBalances } from './balanceCalculator'
import { buildParticipant, buildExpense, buildSettlement } from '@/test/factories'

// A small random trip: 3 fixed participants a,b,c + equal-split expenses + settlements among them.
const arbSnapshot = fc.record({
  expenses: fc.array(
    fc.record({
      paid_by: fc.constantFrom('a', 'b', 'c'),
      amount: fc.integer({ min: 1, max: 1000 }),
      who: fc.subarray(['a', 'b', 'c'], { minLength: 1 }),
    }),
    { maxLength: 6 },
  ),
  settlements: fc.array(
    fc.record({ from: fc.constantFrom('a', 'b', 'c'), to: fc.constantFrom('a', 'b', 'c'), amount: fc.integer({ min: 1, max: 500 }) }),
    { maxLength: 4 },
  ),
}).map(({ expenses, settlements }): Snapshot => ({
  participants: ['a', 'b', 'c'].map(id => buildParticipant({ id, name: id })),
  expenses: expenses.map((e, i) => buildExpense({ id: `e${i}`, paid_by: e.paid_by, amount: e.amount, distribution: { type: 'individuals', participants: e.who } })),
  settlements: settlements
    .filter(s => s.from !== s.to)
    .map((s, i) => buildSettlement({ id: `s${i}`, from_participant_id: s.from, to_participant_id: s.to, amount: s.amount })),
}))

function netSum(snapshot: Snapshot): number {
  const { balances } = calculateBalances(snapshot.expenses, snapshot.participants, 'individuals', snapshot.settlements)
  return balances.reduce((a, b) => a + b.balance, 0)
}

describe('reassignment invariants', () => {
  it('full handover to a fresh person gives B exactly A old balance, others unchanged', () => {
    fc.assert(fc.property(arbSnapshot, (snapshot) => {
      const before = calculateBalances(snapshot.expenses, snapshot.participants, 'individuals', snapshot.settlements)
      const aBalance = before.balances.find(b => b.id === 'a')?.balance ?? 0
      const plan: ReassignmentPlan = {
        op: 'replace', sourceId: 'a', remove: true,
        newParticipant: { id: 'z', trip_id: 'trip-1', name: 'Z', is_adult: true },
        shares: { kind: 'transfer', targetId: 'z' },
        settlements: { kind: 'transfer', targetId: 'z' },
        paid: { kind: 'transfer', targetId: 'z' },
      }
      const next = applyPlan(snapshot, plan)
      const after = calculateBalances(next.expenses, next.participants, 'individuals', next.settlements)
      expect(after.balances.find(b => b.id === 'z')?.balance ?? 0).toBeCloseTo(aBalance, 6)
      for (const id of ['b', 'c']) {
        expect(after.balances.find(b => b.id === id)?.balance ?? 0)
          .toBeCloseTo(before.balances.find(b => b.id === id)?.balance ?? 0, 6)
      }
    }))
  })

  it('full handover preserves the global net-balance sum (no money created/destroyed)', () => {
    fc.assert(fc.property(arbSnapshot, (snapshot) => {
      const plan: ReassignmentPlan = {
        op: 'replace', sourceId: 'a', remove: true,
        newParticipant: { id: 'z', trip_id: 'trip-1', name: 'Z', is_adult: true },
        shares: { kind: 'transfer', targetId: 'z' },
        settlements: { kind: 'transfer', targetId: 'z' },
        paid: { kind: 'transfer', targetId: 'z' },
      }
      expect(netSum(applyPlan(snapshot, plan))).toBeCloseTo(netSum(snapshot), 6)
    }))
  })

  it('round-trip a->z then z->a restores every balance', () => {
    fc.assert(fc.property(arbSnapshot, (snapshot) => {
      const fwd: ReassignmentPlan = {
        op: 'replace', sourceId: 'a', remove: true,
        newParticipant: { id: 'z', trip_id: 'trip-1', name: 'Z', is_adult: true },
        shares: { kind: 'transfer', targetId: 'z' }, settlements: { kind: 'transfer', targetId: 'z' }, paid: { kind: 'transfer', targetId: 'z' },
      }
      const back: ReassignmentPlan = {
        op: 'replace', sourceId: 'z', remove: true,
        newParticipant: { id: 'a', trip_id: 'trip-1', name: 'a', is_adult: true },
        shares: { kind: 'transfer', targetId: 'a' }, settlements: { kind: 'transfer', targetId: 'a' }, paid: { kind: 'transfer', targetId: 'a' },
      }
      const restored = applyPlan(applyPlan(snapshot, fwd), back)
      const before = calculateBalances(snapshot.expenses, snapshot.participants, 'individuals', snapshot.settlements)
      const after = calculateBalances(restored.expenses, restored.participants, 'individuals', restored.settlements)
      for (const id of ['a', 'b', 'c']) {
        expect(after.balances.find(b => b.id === id)?.balance ?? 0)
          .toBeCloseTo(before.balances.find(b => b.id === id)?.balance ?? 0, 6)
      }
    }))
  })

  it('after removal nothing references the removed participant', () => {
    fc.assert(fc.property(arbSnapshot, (snapshot) => {
      const plan: ReassignmentPlan = {
        op: 'remove', sourceId: 'a', remove: true,
        shares: { kind: 'redistribute' }, settlements: { kind: 'delete' }, paid: { kind: 'transfer', targetId: 'b' },
      }
      const next = applyPlan(snapshot, plan)
      expect(next.participants.some(p => p.id === 'a')).toBe(false)
      expect(next.expenses.some(e => e.paid_by === 'a' || e.distribution.participants.includes('a'))).toBe(false)
      expect(next.settlements.some(s => s.from_participant_id === 'a' || s.to_participant_id === 'a')).toBe(false)
    }))
  })
})
