export type TrackingMode = 'individuals' | 'families'

export interface Trip {
  id: string
  name: string
  date: string // Legacy field for compatibility
  start_date: string // ISO date string
  end_date: string // ISO date string
  tracking_mode: TrackingMode
  created_at: string
}

export interface CreateTripInput {
  name: string
  date: string
  start_date: string
  end_date: string
  tracking_mode: TrackingMode
}

export interface UpdateTripInput {
  name?: string
  date?: string
  start_date?: string
  end_date?: string
  tracking_mode?: TrackingMode
}
