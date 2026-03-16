// SPDX-License-Identifier: Apache-2.0
import type { KopikasCategory } from '../types'

export interface CategoryDef {
  key: KopikasCategory
  label: string
  emoji: string
}

export const KOPIKAS_CATEGORIES: CategoryDef[] = [
  { key: 'sweets', label: 'Maiustused', emoji: '🍬' },
  { key: 'snack', label: 'Snäkk', emoji: '🥨' },
  { key: 'food', label: 'Toit', emoji: '🍔' },
  { key: 'clothes', label: 'Riided', emoji: '👕' },
  { key: 'beauty', label: 'Ilu', emoji: '💄' },
  { key: 'fun', label: 'Lõbu', emoji: '🎮' },
  { key: 'school', label: 'Kool', emoji: '📚' },
  { key: 'gifts', label: 'Kingid', emoji: '🎁' },
  { key: 'charity', label: 'Annetus', emoji: '💝' },
  { key: 'other', label: 'Muu', emoji: '📦' },
]

const categoryMap = new Map(KOPIKAS_CATEGORIES.map(c => [c.key, c]))
const fallback = categoryMap.get('other')!

export function getCategoryEmoji(key: KopikasCategory): string {
  return (categoryMap.get(key) ?? fallback).emoji
}

export function getCategoryLabel(key: KopikasCategory): string {
  return (categoryMap.get(key) ?? fallback).label
}

export function getCategoryDef(key: KopikasCategory): CategoryDef {
  return categoryMap.get(key) ?? fallback
}
