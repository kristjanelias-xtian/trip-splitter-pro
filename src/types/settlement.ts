/**
 * Settlement represents a payment transfer between two participants/families
 * Used to record when someone pays back their debt
 */

export interface Settlement {
  id: string
  trip_id: string
  from_participant_id: string // Who paid
  to_participant_id: string // Who received
  amount: number
  currency: string
  settlement_date: string
  note?: string | null
  created_at: string
  updated_at: string
}

export interface CreateSettlementInput {
  trip_id: string
  from_participant_id: string
  to_participant_id: string
  amount: number
  currency: string
  settlement_date?: string
  note?: string
}

export interface UpdateSettlementInput {
  from_participant_id?: string
  to_participant_id?: string
  amount?: number
  currency?: string
  settlement_date?: string
  note?: string
}
