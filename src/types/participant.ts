export interface Participant {
  id: string
  trip_id: string
  wallet_group?: string | null
  name: string
  is_adult: boolean
  user_id?: string | null
  email?: string | null
}

export interface CreateParticipantInput {
  trip_id: string
  wallet_group?: string | null
  name: string
  is_adult: boolean
  email?: string | null
  user_id?: string | null
}

export interface UpdateParticipantInput {
  name?: string
  is_adult?: boolean
  wallet_group?: string | null
  email?: string | null
}
