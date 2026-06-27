// SPDX-License-Identifier: Apache-2.0
import type { Participant, CreateParticipantInput } from '@/types/participant'
import type { Expense, ExpenseDistribution } from '@/types/expense'
import type { Settlement } from '@/types/settlement'

export interface Snapshot {
  participants: Participant[]
  expenses: Expense[]
  settlements: Settlement[]
}

export interface Footprint {
  participantId: string
  paidExpenses: Expense[]
  sharedExpenses: Expense[]
  settlementsFrom: Settlement[]
  settlementsTo: Settlement[]
}

export type SharesChoice =
  | { kind: 'transfer'; targetId: string }
  | { kind: 'redistribute' }
  | { kind: 'drop' }

export type SettlementsChoice =
  | { kind: 'transfer'; targetId: string }
  | { kind: 'delete' }

export type PaidChoice = { kind: 'transfer'; targetId: string }

export interface Backfill {
  expenseId: string
  mode: 'equal' | 'amount'
  amount?: number // required when mode === 'amount'
}

// New-participant ids are caller-generated so the core stays pure/deterministic.
export type NewParticipant = CreateParticipantInput & { id: string }

export type ReassignmentPlan =
  | {
      op: 'replace' | 'remove'
      sourceId: string
      remove: boolean
      newParticipant?: NewParticipant
      shares: SharesChoice
      settlements: SettlementsChoice
      paid: PaidChoice
    }
  | {
      op: 'add'
      newParticipant: NewParticipant
      backfill: Backfill[]
    }

export interface WriteDiff {
  insertParticipant: {
    id: string
    trip_id: string
    name: string
    is_adult: boolean
    email: string | null
    user_id: string | null
    wallet_group: string | null
  } | null
  updateExpenses: { id: string; paid_by?: string; distribution?: ExpenseDistribution }[]
  updateSettlements: { id: string; from_participant_id?: string; to_participant_id?: string }[]
  deleteSettlements: string[]
  deleteParticipantId: string | null
}

function distributionIncludes(d: ExpenseDistribution, id: string): boolean {
  if (d.participants.includes(id)) return true
  return (d.participantSplits ?? []).some(s => s.participantId === id)
}

export function buildFootprint(snapshot: Snapshot, participantId: string): Footprint {
  return {
    participantId,
    paidExpenses: snapshot.expenses.filter(e => e.paid_by === participantId),
    sharedExpenses: snapshot.expenses.filter(e => distributionIncludes(e.distribution, participantId)),
    settlementsFrom: snapshot.settlements.filter(s => s.from_participant_id === participantId),
    settlementsTo: snapshot.settlements.filter(s => s.to_participant_id === participantId),
  }
}
