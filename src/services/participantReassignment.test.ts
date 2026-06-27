// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import { buildFootprint, applyPlan, buildWriteDiff } from './participantReassignment'
import type { NewParticipant, ReassignmentPlan } from './participantReassignment'
import { buildParticipant, buildExpense, buildSettlement } from '@/test/factories'

describe('buildFootprint', () => {
  it('collects every reference to a participant', () => {
    const snapshot = {
      participants: [buildParticipant({ id: 'a' }), buildParticipant({ id: 'b' })],
      expenses: [
        buildExpense({ id: 'e1', paid_by: 'a', distribution: { type: 'individuals', participants: ['a', 'b'] } }),
        buildExpense({ id: 'e2', paid_by: 'b', distribution: { type: 'individuals', participants: ['b'] } }),
      ],
      settlements: [
        buildSettlement({ id: 's1', from_participant_id: 'a', to_participant_id: 'b' }),
        buildSettlement({ id: 's2', from_participant_id: 'b', to_participant_id: 'a' }),
      ],
    }
    const fp = buildFootprint(snapshot, 'a')
    expect(fp.paidExpenses.map(e => e.id)).toEqual(['e1'])
    expect(fp.sharedExpenses.map(e => e.id)).toEqual(['e1'])
    expect(fp.settlementsFrom.map(s => s.id)).toEqual(['s1'])
    expect(fp.settlementsTo.map(s => s.id)).toEqual(['s2'])
  })

  it('detects participants referenced only in participantSplits', () => {
    const snapshot = {
      participants: [buildParticipant({ id: 'a' })],
      expenses: [buildExpense({
        id: 'e1', paid_by: 'x',
        distribution: { type: 'individuals', participants: ['a'], splitMode: 'amount', participantSplits: [{ participantId: 'a', value: 40 }] },
      })],
      settlements: [],
    }
    expect(buildFootprint(snapshot, 'a').sharedExpenses.map(e => e.id)).toEqual(['e1'])
  })
})

describe('applyPlan — full handover to a new person', () => {
  const newPerson: NewParticipant = { id: 'madis', trip_id: 'trip-1', name: 'Madis Maran', is_adult: true }

  function snap() {
    return {
      participants: [
        buildParticipant({ id: 'krissu', name: 'Krissu' }),
        buildParticipant({ id: 'mart', name: 'Mart' }),
      ],
      expenses: [buildExpense({ id: 'e1', paid_by: 'mart', amount: 900, distribution: { type: 'individuals', participants: ['krissu', 'mart'] } })],
      settlements: [buildSettlement({ id: 's1', from_participant_id: 'krissu', to_participant_id: 'mart', amount: 750 })],
    }
  }

  it('moves shares, settlements and paid to the target and deletes the source', () => {
    const plan: ReassignmentPlan = {
      op: 'replace', sourceId: 'krissu', remove: true, newParticipant: newPerson,
      shares: { kind: 'transfer', targetId: 'madis' },
      settlements: { kind: 'transfer', targetId: 'madis' },
      paid: { kind: 'transfer', targetId: 'madis' },
    }
    const next = applyPlan(snap(), plan)
    expect(next.participants.map(p => p.id).sort()).toEqual(['madis', 'mart'])
    expect(next.expenses[0].distribution.participants.sort()).toEqual(['madis', 'mart'])
    expect(next.settlements[0].from_participant_id).toBe('madis')
  })

  it('does not mutate the input snapshot', () => {
    const s = snap()
    const plan: ReassignmentPlan = {
      op: 'replace', sourceId: 'krissu', remove: true, newParticipant: newPerson,
      shares: { kind: 'transfer', targetId: 'madis' },
      settlements: { kind: 'transfer', targetId: 'mart' },
      paid: { kind: 'transfer', targetId: 'mart' },
    }
    applyPlan(s, plan)
    expect(s.participants.map(p => p.id)).toEqual(['krissu', 'mart'])
    expect(s.settlements[0].from_participant_id).toBe('krissu')
  })

  it('collapses a settlement that becomes from===to into deletion', () => {
    const s = {
      participants: [buildParticipant({ id: 'krissu' }), buildParticipant({ id: 'mart' })],
      expenses: [],
      settlements: [buildSettlement({ id: 's1', from_participant_id: 'krissu', to_participant_id: 'mart' })],
    }
    const plan: ReassignmentPlan = {
      op: 'replace', sourceId: 'krissu', remove: true,
      shares: { kind: 'transfer', targetId: 'mart' },
      settlements: { kind: 'transfer', targetId: 'mart' },
      paid: { kind: 'transfer', targetId: 'mart' },
    }
    expect(applyPlan(s, plan).settlements).toEqual([])
  })
})

describe('applyPlan — add with backfill', () => {
  const newPerson = { id: 'n', trip_id: 'trip-1', name: 'Newcomer', is_adult: true }
  function snap() {
    return {
      participants: [buildParticipant({ id: 'a' }), buildParticipant({ id: 'b' })],
      expenses: [buildExpense({ id: 'e1', paid_by: 'a', amount: 90, distribution: { type: 'individuals', participants: ['a', 'b'] } })],
      settlements: [],
    }
  }

  it('adds the participant with no backfill', () => {
    const next = applyPlan(snap(), { op: 'add', newParticipant: newPerson, backfill: [] })
    expect(next.participants.map(p => p.id).sort()).toEqual(['a', 'b', 'n'])
    expect(next.expenses[0].distribution.participants.sort()).toEqual(['a', 'b'])
  })

  it('equal backfill appends the newcomer to the split', () => {
    const next = applyPlan(snap(), { op: 'add', newParticipant: newPerson, backfill: [{ expenseId: 'e1', mode: 'equal' }] })
    expect(next.expenses[0].distribution.participants.sort()).toEqual(['a', 'b', 'n'])
    expect(next.expenses[0].distribution.splitMode ?? 'equal').toBe('equal')
  })

  it('amount backfill gives the newcomer a fixed slice and scales the rest', () => {
    const next = applyPlan(snap(), { op: 'add', newParticipant: newPerson, backfill: [{ expenseId: 'e1', mode: 'amount', amount: 30 }] })
    const d = next.expenses[0].distribution
    expect(d.splitMode).toBe('amount')
    // original a=45,b=45 scaled to total 60 -> 30 each; newcomer 30; sum 90
    expect(d.participantSplits).toEqual([
      { participantId: 'a', value: 30 },
      { participantId: 'b', value: 30 },
      { participantId: 'n', value: 30 },
    ])
  })
})

describe('buildWriteDiff', () => {
  it('emits inserts, updates and deletes for the Krissu-style replace', () => {
    const snapshot = {
      participants: [buildParticipant({ id: 'krissu', name: 'Krissu' }), buildParticipant({ id: 'mart' }), buildParticipant({ id: 'martin' })],
      expenses: [buildExpense({ id: 'e1', paid_by: 'mart', amount: 900, distribution: { type: 'individuals', participants: ['krissu', 'mart'] } })],
      settlements: [buildSettlement({ id: 's1', from_participant_id: 'krissu', to_participant_id: 'mart', amount: 750 })],
    }
    const diff = buildWriteDiff(snapshot, {
      op: 'replace', sourceId: 'krissu', remove: true,
      newParticipant: { id: 'madis', trip_id: 'trip-1', name: 'Madis Maran', is_adult: true },
      shares: { kind: 'transfer', targetId: 'madis' },
      settlements: { kind: 'transfer', targetId: 'martin' },
      paid: { kind: 'transfer', targetId: 'martin' },
    })
    expect(diff.insertParticipant?.id).toBe('madis')
    expect(diff.insertParticipant?.user_id).toBeNull()
    expect(diff.updateExpenses).toEqual([{ id: 'e1', distribution: { type: 'individuals', participants: ['madis', 'mart'] } }])
    expect(diff.updateSettlements).toEqual([{ id: 's1', from_participant_id: 'martin' }])
    expect(diff.deleteParticipantId).toBe('krissu')
    expect(diff.deleteSettlements).toEqual([])
  })

  it('lists collapsed settlements as deletions', () => {
    const snapshot = {
      participants: [buildParticipant({ id: 'a' }), buildParticipant({ id: 'b' })],
      expenses: [],
      settlements: [buildSettlement({ id: 's1', from_participant_id: 'a', to_participant_id: 'b' })],
    }
    const diff = buildWriteDiff(snapshot, {
      op: 'remove', sourceId: 'a', remove: true,
      shares: { kind: 'drop' }, settlements: { kind: 'transfer', targetId: 'b' }, paid: { kind: 'transfer', targetId: 'b' },
    })
    expect(diff.deleteSettlements).toEqual(['s1'])
  })
})

describe('applyPlan — share reallocation', () => {
  function eqSnap() {
    return {
      participants: [buildParticipant({ id: 'a' }), buildParticipant({ id: 'b' }), buildParticipant({ id: 'c' })],
      expenses: [buildExpense({ id: 'e1', paid_by: 'b', amount: 900, distribution: { type: 'individuals', participants: ['a', 'b', 'c'] } })],
      settlements: [],
    }
  }
  const base = { op: 'remove', sourceId: 'a', remove: true,
    settlements: { kind: 'delete' }, paid: { kind: 'transfer', targetId: 'b' } } as const

  it('redistribute on an equal split just drops the source from the list (others re-divide)', () => {
    const next = applyPlan(eqSnap(), { ...base, shares: { kind: 'redistribute' } })
    expect(next.expenses[0].distribution.participants.sort()).toEqual(['b', 'c'])
    expect(next.expenses[0].distribution.splitMode ?? 'equal').toBe('equal')
  })

  it('drop on an equal split freezes remaining shares to amount mode (payer absorbs the gap)', () => {
    const next = applyPlan(eqSnap(), { ...base, shares: { kind: 'drop' } })
    const d = next.expenses[0].distribution
    expect(d.splitMode).toBe('amount')
    // each remaining keeps the original 900/3 = 300 share; total allocated 600 < 900
    expect(d.participantSplits).toEqual([
      { participantId: 'b', value: 300 },
      { participantId: 'c', value: 300 },
    ])
  })

  it('redistribute on a percentage split renormalizes remaining to 100', () => {
    const snap = {
      participants: [buildParticipant({ id: 'a' }), buildParticipant({ id: 'b' }), buildParticipant({ id: 'c' })],
      expenses: [buildExpense({ id: 'e1', paid_by: 'b', amount: 100,
        distribution: { type: 'individuals', participants: ['a', 'b', 'c'], splitMode: 'percentage',
          participantSplits: [{ participantId: 'a', value: 50 }, { participantId: 'b', value: 30 }, { participantId: 'c', value: 20 }] } })],
      settlements: [],
    }
    const d = applyPlan(snap, { ...base, shares: { kind: 'redistribute' } }).expenses[0].distribution
    expect(d.participantSplits).toEqual([
      { participantId: 'b', value: 60 },
      { participantId: 'c', value: 40 },
    ])
  })
})
