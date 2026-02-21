export type TrackingMode = 'individuals' | 'families'

export interface Event {
  id: string
  trip_code: string // URL-friendly code for sharing (e.g., "summer-2025-a3x9k2")
  name: string
  start_date: string // ISO date string (YYYY-MM-DD)
  end_date: string // ISO date string (YYYY-MM-DD)
  event_type: 'trip' | 'event'
  tracking_mode: TrackingMode
  default_currency: string
  exchange_rates: Record<string, number>
  enable_meals: boolean
  enable_activities: boolean
  enable_shopping: boolean
  default_split_all: boolean
  created_by?: string
  created_at: string
}

export interface CreateEventInput {
  name: string
  start_date: string
  end_date: string
  event_type?: 'trip' | 'event'
  tracking_mode: TrackingMode
  trip_code?: string // Optional: will be auto-generated if not provided
  default_currency?: string
  enable_meals?: boolean
  enable_activities?: boolean
  enable_shopping?: boolean
}

export interface UpdateEventInput {
  name?: string
  start_date?: string
  end_date?: string
  event_type?: 'trip' | 'event'
  tracking_mode?: TrackingMode
  default_currency?: string
  exchange_rates?: Record<string, number>
  enable_meals?: boolean
  enable_activities?: boolean
  enable_shopping?: boolean
  default_split_all?: boolean
}

// Backward-compatible aliases — use Event, CreateEventInput, UpdateEventInput in new code
export type Trip = Event
export type CreateTripInput = CreateEventInput
export type UpdateTripInput = UpdateEventInput
