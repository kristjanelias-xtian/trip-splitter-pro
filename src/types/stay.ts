export interface Stay {
  id: string
  trip_id: string
  name: string
  link?: string | null
  comment?: string | null
  check_in_date: string
  check_out_date: string
  latitude?: number | null
  longitude?: number | null
  created_at: string
  updated_at: string
}

export interface CreateStayInput {
  trip_id: string
  name: string
  link?: string
  comment?: string
  check_in_date: string
  check_out_date: string
  latitude?: number | null
  longitude?: number | null
}

export interface UpdateStayInput {
  name?: string
  link?: string
  comment?: string
  check_in_date?: string
  check_out_date?: string
  latitude?: number | null
  longitude?: number | null
}
