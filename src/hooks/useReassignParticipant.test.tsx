// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

const refreshParticipants = vi.fn().mockResolvedValue(undefined)
const refreshExpenses = vi.fn().mockResolvedValue(undefined)
const refreshSettlements = vi.fn().mockResolvedValue(undefined)
vi.mock('@/contexts/ParticipantContext', () => ({ useParticipantContext: () => ({ participants: [{ id: 'krissu', trip_id: 'trip-1', name: 'Krissu', is_adult: true }, { id: 'mart', trip_id: 'trip-1', name: 'Mart', is_adult: true }], refreshParticipants }) }))
vi.mock('@/contexts/ExpenseContext', () => ({ useExpenseContext: () => ({ expenses: [], refreshExpenses }) }))
vi.mock('@/contexts/SettlementContext', () => ({ useSettlementContext: () => ({ settlements: [{ id: 's1', trip_id: 'trip-1', from_participant_id: 'krissu', to_participant_id: 'mart', amount: 750, currency: 'EUR', settlement_date: '2026-01-01', created_at: '', updated_at: '' }], refreshSettlements }) }))
vi.mock('@/hooks/useCurrentTrip', () => ({ useCurrentTrip: () => ({ currentTrip: { id: 'trip-1' } }) }))

import { useReassignParticipant } from './useReassignParticipant'
import type { ReassignmentPlan } from '@/services/participantReassignment'

beforeEach(() => { rpc.mockReset(); refreshParticipants.mockClear(); refreshExpenses.mockClear(); refreshSettlements.mockClear() })

describe('useReassignParticipant', () => {
  it('builds the diff, calls the RPC, and refreshes all contexts', async () => {
    rpc.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useReassignParticipant())
    // settlements.targetId is 'madis' (the new participant) so that krissu->mart becomes madis->mart (not a self-settlement)
    const plan: ReassignmentPlan = {
      op: 'replace', sourceId: 'krissu', remove: true,
      newParticipant: { id: 'madis', trip_id: 'trip-1', name: 'Madis', is_adult: true },
      shares: { kind: 'transfer', targetId: 'madis' },
      settlements: { kind: 'transfer', targetId: 'madis' },
      paid: { kind: 'transfer', targetId: 'mart' },
    }
    let res: { ok: boolean; error?: string } = { ok: false }
    await act(async () => { res = await result.current.reassign(plan) })
    expect(res.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('reassign_participant', expect.objectContaining({ p_trip_id: 'trip-1' }))
    const arg = rpc.mock.calls[0][1].p_diff
    expect(arg.insertParticipant.id).toBe('madis')
    expect(arg.updateSettlements).toEqual([{ id: 's1', from_participant_id: 'madis' }])
    expect(refreshParticipants).toHaveBeenCalled()
    expect(refreshExpenses).toHaveBeenCalled()
    expect(refreshSettlements).toHaveBeenCalled()
  })

  it('returns an error and does not refresh when the RPC fails', async () => {
    rpc.mockResolvedValue({ error: { message: 'Only the trip creator can reassign participants' } })
    const { result } = renderHook(() => useReassignParticipant())
    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.reassign({ op: 'remove', sourceId: 'krissu', remove: true, shares: { kind: 'drop' }, settlements: { kind: 'delete' }, paid: { kind: 'transfer', targetId: 'mart' } })
    })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('creator')
    expect(refreshParticipants).not.toHaveBeenCalled()
  })
})
