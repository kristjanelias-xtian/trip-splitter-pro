import { describe, it, expect } from 'vitest'
import { KOPIKAS_CATEGORIES, getCategoryEmoji, getCategoryLabel } from './kopikasCategories'

describe('kopikasCategories', () => {
  it('has exactly 10 categories', () => {
    expect(KOPIKAS_CATEGORIES).toHaveLength(10)
  })

  it('returns emoji for known category', () => {
    expect(getCategoryEmoji('sweets')).toBe('🍬')
    expect(getCategoryEmoji('food')).toBe('🍔')
  })

  it('returns Estonian label for known category', () => {
    expect(getCategoryLabel('sweets')).toBe('Maiustused')
    expect(getCategoryLabel('beauty')).toBe('Ilu')
  })

  it('returns fallback for unknown category', () => {
    expect(getCategoryEmoji('unknown' as any)).toBe('📦')
    expect(getCategoryLabel('unknown' as any)).toBe('Muu')
  })
})
