export type TrackingMode = 'individuals' | 'families'

export interface Trip {
  id: string
  trip_code: string // URL-friendly code for sharing (e.g., "summer-2025-a3x9k2")
  name: string
  start_date: string // ISO date string (YYYY-MM-DD)
  end_date: string // ISO date string (YYYY-MM-DD)
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

export interface CreateTripInput {
  name: string
  start_date: string
  end_date: string
  tracking_mode: TrackingMode
  trip_code?: string // Optional: will be auto-generated if not provided
  default_currency?: string
  enable_meals?: boolean
  enable_activities?: boolean
  enable_shopping?: boolean
}

export interface UpdateTripInput {
  name?: string
  start_date?: string
  end_date?: string
  tracking_mode?: TrackingMode
  default_currency?: string
  exchange_rates?: Record<string, number>
  enable_meals?: boolean
  enable_activities?: boolean
  enable_shopping?: boolean
  default_split_all?: boolean
}
