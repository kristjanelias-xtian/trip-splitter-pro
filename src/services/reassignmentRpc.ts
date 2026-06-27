// SPDX-License-Identifier: Apache-2.0
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import type { WriteDiff } from './participantReassignment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any

export async function executeReassignment(tripId: string, diff: WriteDiff): Promise<void> {
  const { error } = await withTimeout<{ error: { message: string } | null }>(
    supabaseAny.rpc('reassign_participant', { p_trip_id: tripId, p_diff: diff }) as Promise<{ error: { message: string } | null }>,
    15000,
    'Reassigning the participant timed out. Please check your connection and try again.',
  )
  if (error) throw new Error(error.message)
}
