export interface UserProfile {
  id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  bank_account_holder: string | null
  bank_iban: string | null
  created_at: string
  updated_at: string
}
