export interface Family {
  id: string
  trip_id: string
  family_name: string
  adults: number
  children: number
}

export interface Participant {
  id: string
  trip_id: string
  family_id: string | null
  name: string
  is_adult: boolean
  user_id?: string | null
}

export interface CreateFamilyInput {
  trip_id: string
  family_name: string
  adults: number
  children: number
}

export interface CreateParticipantInput {
  trip_id: string
  family_id?: string | null
  name: string
  is_adult: boolean
}

export interface UpdateFamilyInput {
  family_name?: string
  adults?: number
  children?: number
}

export interface UpdateParticipantInput {
  name?: string
  is_adult?: boolean
  family_id?: string | null
}
