// SPDX-License-Identifier: Apache-2.0
// Requires a running local Supabase: `supabase start`.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
//
// IMPORTANT: the RPC checks auth.uid(), which is NULL for the service-role key.
// So every reassign_participant call must go through an ANON-key client that is
// signed in as the trip creator. `admin` (service role) is used only for seeding
// and for reading back results (it bypasses RLS).
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { applyPlan, buildWriteDiff } from '../../src/services/participantReassignment'
import type { Snapshot, ReassignmentPlan } from '../../src/services/participantReassignment'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY
const run = url && serviceKey && anonKey ? describe : describe.skip // skip when no local stack

run('reassign_participant RPC contract', () => {
  // Lazy-init so createClient is not called when env vars are absent (describe.skip still invokes this callback).
  const admin = createClient(url ?? 'http://localhost', serviceKey ?? 'placeholder')
  let creatorClient: SupabaseClient // anon key, signed in as the creator
  let tripId: string
  let creatorId: string
  const creatorPassword = 'test-password-123!'

  beforeAll(async () => {
    const email = `creator-${Date.now()}@test.local`
    const { data: user } = await admin.auth.admin.createUser({ email, password: creatorPassword, email_confirm: true })
    creatorId = user!.user!.id

    creatorClient = createClient(url!, anonKey!)
    await creatorClient.auth.signInWithPassword({ email, password: creatorPassword })

    const { data: trip } = await admin.from('trips').insert({ name: 'RPC Test', trip_code: `rpc-${Date.now()}`, tracking_mode: 'individuals', created_by: creatorId }).select().single()
    tripId = trip!.id
    await admin.from('participants').insert([
      { id: crypto.randomUUID(), trip_id: tripId, name: 'Krissu', is_adult: true },
      { id: crypto.randomUUID(), trip_id: tripId, name: 'Mart', is_adult: true },
    ])
  })

  it('applies the diff and matches applyPlan (preview == reality)', async () => {
    const { data: participants } = await admin.from('participants').select('*').eq('trip_id', tripId)
    const krissu = participants!.find(p => p.name === 'Krissu')!
    const mart = participants!.find(p => p.name === 'Mart')!
    await admin.from('settlements').insert({ trip_id: tripId, from_participant_id: krissu.id, to_participant_id: mart.id, amount: 750, currency: 'EUR', settlement_date: '2026-01-01' })

    const { data: expenses } = await admin.from('expenses').select('*').eq('trip_id', tripId)
    const { data: settlements } = await admin.from('settlements').select('*').eq('trip_id', tripId)
    const snapshot: Snapshot = { participants: participants as any, expenses: expenses as any, settlements: settlements as any }

    const madisId = crypto.randomUUID()
    const plan: ReassignmentPlan = {
      op: 'replace', sourceId: krissu.id, remove: true,
      newParticipant: { id: madisId, trip_id: tripId, name: 'Madis Maran', is_adult: true },
      shares: { kind: 'transfer', targetId: madisId },
      settlements: { kind: 'transfer', targetId: mart.id },
      paid: { kind: 'transfer', targetId: mart.id },
    }
    const diff = buildWriteDiff(snapshot, plan)
    const expected = applyPlan(snapshot, plan)

    // Call as the authenticated creator (auth.uid() === creatorId).
    const { error } = await creatorClient.rpc('reassign_participant', { p_trip_id: tripId, p_diff: diff })
    expect(error).toBeNull()

    const { data: finalParticipants } = await admin.from('participants').select('*').eq('trip_id', tripId)
    const { data: finalSettlements } = await admin.from('settlements').select('*').eq('trip_id', tripId)
    expect(finalParticipants!.some(p => p.id === krissu.id)).toBe(false)
    expect(finalParticipants!.some(p => p.id === madisId)).toBe(true)
    expect(expected.participants.map(p => p.id).sort()).toEqual(finalParticipants!.map(p => p.id).sort())
    const movedSettlement = finalSettlements!.find(s => s.amount === 750)
    expect(movedSettlement!.from_participant_id).toBe(mart.id)
  })

  it('rejects a non-creator caller', async () => {
    const otherEmail = `other-${Date.now()}@test.local`
    await admin.auth.admin.createUser({ email: otherEmail, password: creatorPassword, email_confirm: true })
    const other = createClient(url!, anonKey!)
    await other.auth.signInWithPassword({ email: otherEmail, password: creatorPassword })
    const { error } = await other.rpc('reassign_participant', { p_trip_id: tripId, p_diff: { insertParticipant: null, updateExpenses: [], updateSettlements: [], deleteSettlements: [], deleteParticipantId: null } })
    expect(error?.message ?? '').toContain('creator')
  })

  it('rolls back fully when the diff references an invalid value', async () => {
    const { data: before } = await admin.from('participants').select('id').eq('trip_id', tripId)
    const badDiff = {
      insertParticipant: { id: crypto.randomUUID(), trip_id: tripId, name: 'Ghost', is_adult: true, email: null, user_id: null, wallet_group: null },
      updateExpenses: [{ id: '00000000-0000-0000-0000-000000000000', paid_by: 'not-a-uuid' }],
      updateSettlements: [], deleteSettlements: [], deleteParticipantId: null,
    }
    const { error } = await creatorClient.rpc('reassign_participant', { p_trip_id: tripId, p_diff: badDiff })
    expect(error).not.toBeNull() // invalid uuid cast raises
    const { data: after } = await admin.from('participants').select('id').eq('trip_id', tripId)
    expect(after!.length).toBe(before!.length) // Ghost insert was rolled back
  })
})
