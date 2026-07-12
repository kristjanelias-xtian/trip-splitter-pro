// SPDX-License-Identifier: Apache-2.0
export type ActivityTimeSlot = 'morning' | 'afternoon' | 'evening'

export interface Activity {
  id: string
  trip_id: string
  activity_date: string // YYYY-MM-DD
  time_slot: ActivityTimeSlot
  start_time?: string | null // HH:MM (24h), optional — orders activities within a slot
  title: string
  description?: string | null
  location?: string | null
  link?: string | null
  responsible_participant_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateActivityInput {
  trip_id: string
  activity_date: string
  time_slot: ActivityTimeSlot
  start_time?: string | null
  title: string
  description?: string
  location?: string
  link?: string
  responsible_participant_id?: string
}

export interface UpdateActivityInput {
  start_time?: string | null
  title?: string
  description?: string
  location?: string
  link?: string
  responsible_participant_id?: string
}

export const TIME_SLOT_LABELS: Record<ActivityTimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}
