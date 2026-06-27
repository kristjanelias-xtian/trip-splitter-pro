// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest'
import { buildFootprint } from './participantReassignment'
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
