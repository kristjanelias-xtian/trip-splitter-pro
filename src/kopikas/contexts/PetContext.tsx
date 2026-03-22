// SPDX-License-Identifier: Apache-2.0
import { createContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'
import type { WalletPet, WalletTransaction, MoodResult } from '../types'
import { STARTER_EMOJIS } from '../types'
import { calculateMood } from '../lib/petMoodCalculator'
import { getLevelForXp, checkWeeklyBonuses } from '../lib/xpCalculator'
import { useBudget } from './BudgetContext'

interface PetContextValue {
  pet: WalletPet | null
  loading: boolean
  mood: MoodResult
  isNamed: boolean
  namePet: (name: string) => Promise<void>
  awardXp: (amount: number) => Promise<void>
  checkAndAwardBonuses: () => Promise<void>
}

export const PetContext = createContext<PetContextValue | undefined>(undefined)

interface PetProviderProps {
  walletId: string | null
  transactions: WalletTransaction[]
  children: ReactNode
}

export function PetProvider({ walletId, transactions, children }: PetProviderProps) {
  const [pet, setPet] = useState<WalletPet | null>(null)
  const [loading, setLoading] = useState(false)
  const { newSignal, cancel } = useAbortController()

  const { budgetState } = useBudget()
  const mood = useMemo(() => calculateMood(transactions, new Date(), budgetState ?? undefined), [transactions, budgetState])
  const isNamed = pet?.name != null

  const checkAndAwardBonuses = async (currentPet?: WalletPet | null) => {
    const petToCheck = currentPet ?? pet
    if (!petToCheck || !walletId) return

    const bonuses = checkWeeklyBonuses(transactions, petToCheck)
    const totalBonus = bonuses.underBudget + bonuses.diversity + bonuses.streak

    if (totalBonus === 0) return

    const newXp = petToCheck.xp + totalBonus
    const newLevel = getLevelForXp(newXp)
    const todayStr = new Date().toISOString().slice(0, 10)

    const updates: Partial<WalletPet> = {
      xp: newXp,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }
    if (bonuses.underBudget > 0 || bonuses.diversity > 0) {
      updates.last_weekly_xp_check = todayStr
    }
    if (bonuses.streak > 0) {
      updates.last_streak_xp_check = todayStr
    }

    try {
      const { error } = await withTimeout(
        (supabase.from('wallet_pets' as any) as any)
          .update(updates)
          .eq('wallet_id', walletId),
        15000,
        'Boonuste andmine aegus. Kontrolli ühendust ja proovi uuesti.'
      ) as { error: any }

      if (error) {
        logger.error('Failed to award bonuses', { wallet_id: walletId, error: error.message })
        return
      }

      setPet((prev) => prev ? { ...prev, ...updates } : prev)
    } catch (error) {
      logger.error('Failed to award bonuses', {
        wallet_id: walletId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const fetchPet = async () => {
    if (!walletId) {
      setPet(null)
      return
    }

    const signal = newSignal()
    setLoading(true)

    try {
      const { data, error } = await withTimeout<any>(
        (supabase.from('wallet_pets' as any) as any)
          .select('*')
          .eq('wallet_id', walletId)
          .maybeSingle()
          .abortSignal(signal),
        15000,
        'Lemmiku laadimine aegus. Kontrolli ühendust ja proovi uuesti.'
      )

      if (signal.aborted) return

      if (error) {
        logger.error('Failed to fetch pet', { wallet_id: walletId, error: error.message })
        return
      }

      if (data) {
        setPet(data as WalletPet)
        await checkAndAwardBonuses(data as WalletPet)
      } else {
        // No pet exists — create one
        const randomEmoji = STARTER_EMOJIS[Math.floor(Math.random() * STARTER_EMOJIS.length)]
        const newPet: Omit<WalletPet, 'created_at' | 'updated_at'> = {
          wallet_id: walletId,
          name: null,
          level: 1,
          xp: 0,
          starter_emoji: randomEmoji,
          last_weekly_xp_check: null,
          last_streak_xp_check: null,
        }

        const { data: created, error: createError } = await withTimeout<any>(
          (supabase.from('wallet_pets' as any) as any)
            .insert([newPet])
            .select()
            .single(),
          15000,
          'Lemmiku loomine aegus. Kontrolli ühendust ja proovi uuesti.'
        )

        if (signal.aborted) return

        if (createError) {
          logger.error('Failed to create pet', { wallet_id: walletId, error: createError.message })
          return
        }

        if (created) {
          setPet(created as WalletPet)
          await checkAndAwardBonuses(created as WalletPet)
        }
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError' || signal.aborted) return
      logger.error('Failed to fetch/create pet', {
        wallet_id: walletId,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchPet()
    return cancel
  }, [walletId])

  const namePet = async (name: string): Promise<void> => {
    if (!walletId || !pet) return

    try {
      const { error } = await withTimeout(
        (supabase.from('wallet_pets' as any) as any)
          .update({ name, updated_at: new Date().toISOString() })
          .eq('wallet_id', walletId),
        15000,
        'Nime salvestamine aegus. Kontrolli ühendust ja proovi uuesti.'
      ) as { error: any }

      if (error) {
        logger.error('Failed to name pet', { wallet_id: walletId, error: error.message })
        return
      }

      setPet((prev) => prev ? { ...prev, name, updated_at: new Date().toISOString() } : prev)
    } catch (error) {
      logger.error('Failed to name pet', {
        wallet_id: walletId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const awardXp = async (amount: number): Promise<void> => {
    if (!walletId || !pet) return

    const newXp = pet.xp + amount
    const newLevel = getLevelForXp(newXp)
    const updates = {
      xp: newXp,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }

    try {
      const { error } = await withTimeout(
        (supabase.from('wallet_pets' as any) as any)
          .update(updates)
          .eq('wallet_id', walletId),
        15000,
        'XP andmine aegus. Kontrolli ühendust ja proovi uuesti.'
      ) as { error: any }

      if (error) {
        logger.error('Failed to award XP', { wallet_id: walletId, error: error.message })
        return
      }

      setPet((prev) => prev ? { ...prev, ...updates } : prev)
    } catch (error) {
      logger.error('Failed to award XP', {
        wallet_id: walletId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const value: PetContextValue = {
    pet,
    loading,
    mood,
    isNamed,
    namePet,
    awardXp,
    checkAndAwardBonuses: () => checkAndAwardBonuses(),
  }

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}
