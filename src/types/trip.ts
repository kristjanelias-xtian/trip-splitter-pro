export type TrackingMode = 'individuals' | 'families'

export interface Trip {
  id: string
  name: string
  start_date: string // ISO date string (YYYY-MM-DD)
  end_date: string // ISO date string (YYYY-MM-DD)
  tracking_mode: TrackingMode
  created_at: string
}

export interface CreateTripInput {
  name: string
  start_date: string
  end_date: string
  tracking_mode: TrackingMode
}

export interface UpdateTripInput {
  name?: string
  start_date?: string
  end_date?: string
  tracking_mode?: TrackingMode
}
