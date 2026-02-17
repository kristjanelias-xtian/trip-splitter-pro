import { describe, it, expect } from 'vitest'
import {
  createTripSlug,
  generateTripCode,
  isValidTripCode,
  extractTripCodeFromUrl,
  generateShareableUrl,
} from './tripCodeGenerator'

describe('createTripSlug', () => {
  it('converts to lowercase', () => {
    expect(createTripSlug('Summer 2025')).toBe('summer-2025')
  })

  it('replaces special characters with hyphens', () => {
    expect(createTripSlug('Beach Trip!')).toBe('beach-trip')
  })

  it('strips leading and trailing hyphens', () => {
    expect(createTripSlug('!!!hello!!!')).toBe('hello')
  })

  it('truncates to 30 characters', () => {
    const long = 'a'.repeat(50)
    expect(createTripSlug(long).length).toBeLessThanOrEqual(30)
  })

  it('handles empty string', () => {
    expect(createTripSlug('')).toBe('')
  })

  it('collapses multiple special chars into single hyphen', () => {
    expect(createTripSlug('hello   world')).toBe('hello-world')
  })
})

describe('generateTripCode', () => {
  it('produces format slug-XXXXXX', () => {
    const code = generateTripCode('Summer 2025')
    expect(code).toMatch(/^summer-2025-[a-zA-Z0-9]{6}$/)
  })

  it('generates unique codes across calls', () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateTripCode('Test')))
    expect(codes.size).toBe(10)
  })
})

describe('isValidTripCode', () => {
  it('accepts valid trip codes', () => {
    expect(isValidTripCode('summer-2025-a3x9k2')).toBe(true)
    expect(isValidTripCode('my-trip-Abc123')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(isValidTripCode('invalid')).toBe(false)
    expect(isValidTripCode('')).toBe(false)
    expect(isValidTripCode('abc-12345')).toBe(false) // only 5 chars
    expect(isValidTripCode('abc-1234567')).toBe(false) // 7 chars
  })
})

describe('extractTripCodeFromUrl', () => {
  it('extracts from full URL with /t/', () => {
    const result = extractTripCodeFromUrl('https://split.xtian.me/t/summer-2025-a3x9k2')
    expect(result).toBe('summer-2025-a3x9k2')
  })

  it('returns direct code if valid', () => {
    expect(extractTripCodeFromUrl('summer-2025-a3x9k2')).toBe('summer-2025-a3x9k2')
  })

  it('returns null for invalid input', () => {
    expect(extractTripCodeFromUrl('not-valid')).toBeNull()
    expect(extractTripCodeFromUrl('https://example.com/other')).toBeNull()
  })
})

describe('generateShareableUrl', () => {
  it('produces correct URL format', () => {
    const url = generateShareableUrl('summer-2025-a3x9k2', 'https://split.xtian.me')
    expect(url).toBe('https://split.xtian.me/t/summer-2025-a3x9k2')
  })
})
