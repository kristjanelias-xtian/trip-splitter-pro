// SPDX-License-Identifier: Apache-2.0

export interface Wallet {
  id: string
  wallet_code: string
  name: string
  currency: string
  created_by: string
  created_at: string
}

export interface WalletMember {
  id: string
  wallet_id: string
  user_id: string
  role: 'parent'
}

export type TransactionType = 'allowance' | 'expense'

export type KopikasCategory =
  | 'sweets' | 'food' | 'clothes' | 'beauty'
  | 'fun' | 'school' | 'gifts' | 'charity' | 'other'

export interface WalletTransaction {
  id: string
  wallet_id: string
  type: TransactionType
  amount: number
  description: string | null
  category: KopikasCategory | null
  receipt_image_path: string | null
  created_at: string
}

export interface CreateTransactionInput {
  wallet_id: string
  type: TransactionType
  amount: number
  description?: string
  category?: KopikasCategory
  receipt_image_path?: string
}

export interface WalletPet {
  wallet_id: string
  name: string | null
  level: number
  xp: number
  starter_emoji: string
  last_weekly_xp_check: string | null
  last_streak_xp_check: string | null
  created_at: string
  updated_at: string
}

export type MoodTier = 'ecstatic' | 'happy' | 'neutral' | 'worried'

export interface MoodResult {
  score: number
  tier: MoodTier
  signals: {
    balanceHealth: number
    categoryDiversity: number
    loggingConsistency: number
  }
}

export interface CategoryCorrection {
  id: string
  wallet_id: string
  item_description: string
  original_category: string
  corrected_category: string
  created_at: string
}

export const PET_LEVELS = [
  { level: 1, xpNeeded: 0, description: 'Väike klõmps, lihtsad silmad' },
  { level: 2, xpNeeded: 100, description: 'Natuke suurem, sai suu' },
  { level: 3, xpNeeded: 300, description: 'Punased põsed, kerge sära' },
  { level: 4, xpNeeded: 600, description: 'Sai krooni!' },
  { level: 5, xpNeeded: 1000, description: 'Täis sära, sädemeid ja ilu!' },
] as const

export const STARTER_EMOJIS = ['🫧', '🟣', '🔮', '💜'] as const
