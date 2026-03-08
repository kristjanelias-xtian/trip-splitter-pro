// SPDX-License-Identifier: Apache-2.0
export interface Participant {
  id: string
  trip_id: string
  wallet_group?: string | null
  name: string
  nickname?: string | null
  is_adult: boolean
  user_id?: string | null
  email?: string | null
  avatar_url?: string | null // client-side enrichment from user_profiles, not a DB column
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
  nickname?: string | null
  is_adult?: boolean
  wallet_group?: string | null
  email?: string | null
}
