import { describe, it, expect } from 'vitest'
import { inferKopikasCategory } from './categoryInference'

describe('inferKopikasCategory', () => {
  it('infers sweets from candy keywords', () => {
    expect(inferKopikasCategory('Haribo karud')).toBe('sweets')
    expect(inferKopikasCategory('chocolate bar')).toBe('sweets')
    expect(inferKopikasCategory('jäätis')).toBe('sweets')
  })

  it('infers food from food keywords', () => {
    expect(inferKopikasCategory('lõunasöök')).toBe('food')
    expect(inferKopikasCategory('pizza')).toBe('food')
  })

  it('infers school from school keywords', () => {
    expect(inferKopikasCategory('vihik')).toBe('school')
    expect(inferKopikasCategory('notebook')).toBe('school')
  })

  it('returns null for unrecognized input', () => {
    expect(inferKopikasCategory('asdf1234')).toBeNull()
  })

  it('infers snack from snack keywords', () => {
    expect(inferKopikasCategory('krõpsud')).toBe('snack')
    expect(inferKopikasCategory('chips')).toBe('snack')
    expect(inferKopikasCategory('snäkk')).toBe('snack')
  })

  it('is case insensitive', () => {
    expect(inferKopikasCategory('HARIBO')).toBe('sweets')
  })
})
