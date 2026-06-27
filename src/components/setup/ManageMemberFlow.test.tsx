// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const reassign = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/hooks/useReassignParticipant', () => ({
  useReassignParticipant: () => ({
    reassign,
    previewSnapshot: () => ({
      participants: [
        { id: 'krissu', trip_id: 'trip-1', name: 'Krissu', is_adult: true },
        { id: 'mart', trip_id: 'trip-1', name: 'Mart', is_adult: true },
        { id: 'martin', trip_id: 'trip-1', name: 'Martin', is_adult: true },
      ],
      expenses: [{ id: 'e1', trip_id: 'trip-1', description: 'Majutus', amount: 900, currency: 'EUR', paid_by: 'mart', distribution: { type: 'individuals', participants: ['krissu', 'mart'] }, category: 'Accommodation', expense_date: '2026-01-01', created_at: '', updated_at: '' }],
      settlements: [{ id: 's1', trip_id: 'trip-1', from_participant_id: 'krissu', to_participant_id: 'mart', amount: 750, currency: 'EUR', settlement_date: '2026-01-01', created_at: '', updated_at: '' }],
    }),
  }),
}))
vi.mock('@/hooks/useCurrentTrip', () => ({ useCurrentTrip: () => ({ currentTrip: { id: 'trip-1', default_currency: 'EUR', exchange_rates: {}, tracking_mode: 'individuals' } }) }))

import { ManageMemberFlow } from './ManageMemberFlow'

beforeEach(() => reassign.mockClear())

describe('ManageMemberFlow — replace', () => {
  it('reassigns shares to a new person and settlements to a chosen person, then confirms', async () => {
    render(<ManageMemberFlow open mode="replace" sourceParticipantId="krissu" onClose={() => {}} />)
    // choose: new person named Madis Maran
    fireEvent.click(screen.getByRole('button', { name: /add a new person/i }))
    fireEvent.change(screen.getByLabelText(/new person name/i), { target: { value: 'Madis Maran' } })
    // reallocate mode: settlements -> Martin
    fireEvent.click(screen.getByRole('button', { name: /drop out & reallocate/i }))
    fireEvent.change(screen.getByLabelText(/settlements destination/i), { target: { value: 'martin' } })
    // go to preview + confirm
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(reassign).toHaveBeenCalledTimes(1))
    const plan = reassign.mock.calls[0][0]
    expect(plan.op).toBe('replace')
    expect(plan.newParticipant.name).toBe('Madis Maran')
    expect(plan.shares).toEqual({ kind: 'transfer', targetId: plan.newParticipant.id })
    expect(plan.settlements).toEqual({ kind: 'transfer', targetId: 'martin' })
  })
})
