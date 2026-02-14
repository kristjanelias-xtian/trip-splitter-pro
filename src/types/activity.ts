export type ActivityTimeSlot = 'morning' | 'afternoon' | 'evening'

export interface Activity {
  id: string
  trip_id: string
  activity_date: string // YYYY-MM-DD
  time_slot: ActivityTimeSlot
  title: string
  description?: string | null
  location?: string | null
  responsible_participant_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateActivityInput {
  trip_id: string
  activity_date: string
  time_slot: ActivityTimeSlot
  title: string
  description?: string
  location?: string
  responsible_participant_id?: string
}

export interface UpdateActivityInput {
  title?: string
  description?: string
  location?: string
  responsible_participant_id?: string
}

export const TIME_SLOT_LABELS: Record<ActivityTimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}
