import { describe, it, expect } from 'vitest'
import { canLinkExpenseToMeal } from './mealExpenseLinkService'
import { buildExpense } from '@/test/factories'

// Only testing the pure function — async Supabase functions are integration tests
describe('canLinkExpenseToMeal', () => {
  it('returns true for Food category', () => {
    const expense = buildExpense({ category: 'Food' })
    expect(canLinkExpenseToMeal(expense)).toBe(true)
  })

  it('returns false for other categories', () => {
    expect(canLinkExpenseToMeal(buildExpense({ category: 'Transport' }))).toBe(false)
    expect(canLinkExpenseToMeal(buildExpense({ category: 'Accommodation' }))).toBe(false)
    expect(canLinkExpenseToMeal(buildExpense({ category: 'Activities' }))).toBe(false)
    expect(canLinkExpenseToMeal(buildExpense({ category: 'Other' }))).toBe(false)
  })
})
