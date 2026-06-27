// SPDX-License-Identifier: Apache-2.0
import type { Participant, CreateParticipantInput } from '@/types/participant'
import type { Expense, ExpenseDistribution, ParticipantSplit } from '@/types/expense'
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

function asParticipant(input: NewParticipant): Participant {
  return {
    id: input.id,
    trip_id: input.trip_id,
    name: input.name,
    is_adult: input.is_adult,
    email: input.email ?? null,
    user_id: input.user_id ?? null,
    wallet_group: input.wallet_group ?? null,
    nickname: null,
  }
}

// Replace participant `from` with `to` everywhere in a distribution.
function transferInDistribution(d: ExpenseDistribution, from: string, to: string): ExpenseDistribution {
  if (!distributionIncludes(d, from)) return d
  const participants = Array.from(new Set(d.participants.map(p => (p === from ? to : p))))
  let participantSplits: ParticipantSplit[] | undefined = d.participantSplits
  if (participantSplits) {
    const merged = new Map<string, number>()
    for (const s of participantSplits) {
      const key = s.participantId === from ? to : s.participantId
      merged.set(key, (merged.get(key) ?? 0) + s.value)
    }
    participantSplits = Array.from(merged, ([participantId, value]) => ({ participantId, value }))
  }
  return { ...d, participants, participantSplits }
}

// Absolute per-participant shares (in the expense's own currency).
function participantShares(d: ExpenseDistribution, amount: number): Map<string, number> {
  const mode = d.splitMode ?? 'equal'
  const m = new Map<string, number>()
  if (mode === 'equal') {
    const per = d.participants.length ? amount / d.participants.length : 0
    for (const pid of d.participants) m.set(pid, per)
  } else {
    for (const s of d.participantSplits ?? []) {
      const v = mode === 'percentage' ? (amount * s.value) / 100 : s.value
      m.set(s.participantId, (m.get(s.participantId) ?? 0) + v)
    }
  }
  return m
}

function applyShares(d: ExpenseDistribution, sourceId: string, choice: SharesChoice, amount: number): ExpenseDistribution {
  if (choice.kind === 'transfer') return transferInDistribution(d, sourceId, choice.targetId)

  const mode = d.splitMode ?? 'equal'

  if (choice.kind === 'redistribute') {
    if (mode === 'equal') {
      // Remove source; remaining re-divide automatically.
      return { ...d, participants: d.participants.filter(p => p !== sourceId) }
    }
    // percentage/amount: drop source's split, renormalize the rest to the original total.
    const remaining = (d.participantSplits ?? []).filter(s => s.participantId !== sourceId)
    const sum = remaining.reduce((a, s) => a + s.value, 0)
    const targetTotal = mode === 'percentage' ? 100 : amount
    const scaled = sum === 0 ? remaining : remaining.map(s => ({ participantId: s.participantId, value: (s.value * targetTotal) / sum }))
    return { ...d, participants: d.participants.filter(p => p !== sourceId), participantSplits: scaled }
  }

  // drop: source's share vanishes; remaining keep their absolute amounts (payer absorbs the gap).
  const shares = participantShares(d, amount)
  shares.delete(sourceId)
  const participantSplits = Array.from(shares, ([participantId, value]) => ({ participantId, value }))
  return {
    ...d,
    participants: d.participants.filter(p => p !== sourceId),
    splitMode: 'amount',
    participantSplits,
  }
}

// Placeholder replaced in Task 4.
function applyAdd(snapshot: Snapshot, _plan: Extract<ReassignmentPlan, { op: 'add' }>): Snapshot {
  return snapshot
}

export function applyPlan(snapshot: Snapshot, plan: ReassignmentPlan): Snapshot {
  if (plan.op === 'add') {
    return applyAdd(snapshot, plan)
  }

  let participants = snapshot.participants.map(p => ({ ...p }))
  if (plan.newParticipant && !participants.some(p => p.id === plan.newParticipant!.id)) {
    participants = [...participants, asParticipant(plan.newParticipant)]
  }

  // Expenses: shares + paid
  const expenses = snapshot.expenses.map(e => {
    let distribution = e.distribution
    if (distributionIncludes(distribution, plan.sourceId)) {
      distribution = applyShares(distribution, plan.sourceId, plan.shares, e.amount)
    }
    let paid_by = e.paid_by
    if (paid_by === plan.sourceId) paid_by = plan.paid.targetId
    return distribution === e.distribution && paid_by === e.paid_by ? e : { ...e, distribution, paid_by }
  })

  // Settlements: transfer or delete, then collapse self-settlements
  let settlements = snapshot.settlements
  if (plan.settlements.kind === 'delete') {
    settlements = settlements.filter(s => s.from_participant_id !== plan.sourceId && s.to_participant_id !== plan.sourceId)
  } else {
    const t = plan.settlements.targetId
    settlements = settlements.map(s => {
      const from = s.from_participant_id === plan.sourceId ? t : s.from_participant_id
      const to = s.to_participant_id === plan.sourceId ? t : s.to_participant_id
      return from === s.from_participant_id && to === s.to_participant_id ? s : { ...s, from_participant_id: from, to_participant_id: to }
    })
  }
  settlements = settlements.filter(s => s.from_participant_id !== s.to_participant_id)

  if (plan.remove) {
    participants = participants.filter(p => p.id !== plan.sourceId)
  }

  return { participants, expenses, settlements }
}
