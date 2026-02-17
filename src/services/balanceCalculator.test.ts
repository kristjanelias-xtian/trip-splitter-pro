import { describe, it, expect } from 'vitest'
import {
  convertToBaseCurrency,
  calculateExpenseShares,
  calculateBalances,
  getBalanceForEntity,
  formatBalance,
  getBalanceColorClass,
} from './balanceCalculator'
import { buildParticipant, buildFamily, buildExpense, buildSettlement } from '@/test/factories'
import type { Participant, Family } from '@/types/participant'

// ─── convertToBaseCurrency ────────────────────────────────────────
describe('convertToBaseCurrency', () => {
  it('returns the amount unchanged when currencies are the same', () => {
    expect(convertToBaseCurrency(100, 'EUR', 'EUR', {})).toBe(100)
  })

  it('converts using the provided exchange rate', () => {
    // 385 THB / 38.5 = 10 EUR
    expect(convertToBaseCurrency(385, 'THB', 'EUR', { THB: 38.5 })).toBe(10)
  })

  it('falls back to original amount when rate is missing', () => {
    expect(convertToBaseCurrency(100, 'USD', 'EUR', {})).toBe(100)
  })

  it('falls back to original amount when rate is zero', () => {
    expect(convertToBaseCurrency(100, 'USD', 'EUR', { USD: 0 })).toBe(100)
  })
})

// ─── calculateExpenseShares ───────────────────────────────────────
describe('calculateExpenseShares', () => {
  const p1 = buildParticipant({ id: 'p1', name: 'Alice' })
  const p2 = buildParticipant({ id: 'p2', name: 'Bob' })
  const p3 = buildParticipant({ id: 'p3', name: 'Carol', family_id: 'f1' })
  const p4 = buildParticipant({ id: 'p4', name: 'Dave', family_id: 'f1' })
  const p5 = buildParticipant({ id: 'p5', name: 'Eve', family_id: 'f2' })

  const f1 = buildFamily({ id: 'f1', family_name: 'Smith', adults: 2, children: 1 })
  const f2 = buildFamily({ id: 'f2', family_name: 'Jones', adults: 1, children: 0 })

  const participants: Participant[] = [p1, p2, p3, p4, p5]
  const families: Family[] = [f1, f2]

  // --- individuals distribution ---
  describe('individuals + equal', () => {
    it('splits evenly among listed individuals', () => {
      const expense = buildExpense({
        amount: 90,
        distribution: { type: 'individuals', participants: ['p1', 'p2', 'p3'] },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      expect(shares.get('p1')).toBe(30)
      expect(shares.get('p2')).toBe(30)
      expect(shares.get('p3')).toBe(30)
    })

    it('aggregates to family in families tracking mode', () => {
      const expense = buildExpense({
        amount: 100,
        distribution: { type: 'individuals', participants: ['p3', 'p4'] },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'families')
      // Both p3 and p4 belong to f1, so family f1 gets the full 100
      expect(shares.get('f1')).toBe(100)
    })
  })

  describe('individuals + percentage', () => {
    it('splits by percentage', () => {
      const expense = buildExpense({
        amount: 200,
        distribution: {
          type: 'individuals',
          participants: ['p1', 'p2'],
          splitMode: 'percentage',
          participantSplits: [
            { participantId: 'p1', value: 60 },
            { participantId: 'p2', value: 40 },
          ],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      expect(shares.get('p1')).toBe(120)
      expect(shares.get('p2')).toBe(80)
    })
  })

  describe('individuals + amount', () => {
    it('splits by custom amounts', () => {
      const expense = buildExpense({
        amount: 150,
        distribution: {
          type: 'individuals',
          participants: ['p1', 'p2'],
          splitMode: 'amount',
          participantSplits: [
            { participantId: 'p1', value: 100 },
            { participantId: 'p2', value: 50 },
          ],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      expect(shares.get('p1')).toBe(100)
      expect(shares.get('p2')).toBe(50)
    })
  })

  // --- families distribution ---
  describe('families + equal (as units)', () => {
    it('splits evenly among families as units by default', () => {
      const expense = buildExpense({
        amount: 200,
        distribution: { type: 'families', families: ['f1', 'f2'] },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'families')
      expect(shares.get('f1')).toBe(100)
      expect(shares.get('f2')).toBe(100)
    })
  })

  describe('families + equal (accountForFamilySize)', () => {
    it('splits proportionally by family size', () => {
      const expense = buildExpense({
        amount: 400,
        distribution: {
          type: 'families',
          families: ['f1', 'f2'],
          accountForFamilySize: true,
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'families')
      // f1 = 3 people, f2 = 1 person => total 4
      // f1 gets 400 * 3/4 = 300, f2 gets 400 * 1/4 = 100
      expect(shares.get('f1')).toBe(300)
      expect(shares.get('f2')).toBe(100)
    })
  })

  describe('families + percentage', () => {
    it('splits families by percentage', () => {
      const expense = buildExpense({
        amount: 500,
        distribution: {
          type: 'families',
          families: ['f1', 'f2'],
          splitMode: 'percentage',
          familySplits: [
            { familyId: 'f1', value: 70 },
            { familyId: 'f2', value: 30 },
          ],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'families')
      expect(shares.get('f1')).toBe(350)
      expect(shares.get('f2')).toBe(150)
    })
  })

  describe('families + amount', () => {
    it('splits families by custom amount', () => {
      const expense = buildExpense({
        amount: 300,
        distribution: {
          type: 'families',
          families: ['f1', 'f2'],
          splitMode: 'amount',
          familySplits: [
            { familyId: 'f1', value: 200 },
            { familyId: 'f2', value: 100 },
          ],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'families')
      expect(shares.get('f1')).toBe(200)
      expect(shares.get('f2')).toBe(100)
    })
  })

  // --- mixed distribution ---
  describe('mixed + equal', () => {
    it('deduplicates family members from standalone participants', () => {
      // p1 is standalone (no family), p3 belongs to f1
      // We list both f1 AND p3 — p3 should be deduped
      const expense = buildExpense({
        amount: 400,
        distribution: {
          type: 'mixed',
          families: ['f1'],
          participants: ['p1', 'p3'], // p3 is in f1, should be deduped
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      // f1 = 3 people + p1 = 1 standalone => total 4 people
      // perPerson = 400 / 4 = 100
      // f1 = 300, p1 = 100
      expect(shares.get('f1')).toBe(300)
      expect(shares.get('p1')).toBe(100)
      expect(shares.has('p3')).toBe(false) // p3 is counted under f1
    })
  })

  describe('mixed + percentage', () => {
    it('splits by percentage for families and standalone participants', () => {
      const expense = buildExpense({
        amount: 1000,
        distribution: {
          type: 'mixed',
          families: ['f1'],
          participants: ['p1'],
          splitMode: 'percentage',
          familySplits: [{ familyId: 'f1', value: 80 }],
          participantSplits: [{ participantId: 'p1', value: 20 }],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      expect(shares.get('f1')).toBe(800)
      expect(shares.get('p1')).toBe(200)
    })
  })

  describe('mixed + amount', () => {
    it('splits by custom amount for families and standalone participants', () => {
      const expense = buildExpense({
        amount: 600,
        distribution: {
          type: 'mixed',
          families: ['f1'],
          participants: ['p1'],
          splitMode: 'amount',
          familySplits: [{ familyId: 'f1', value: 400 }],
          participantSplits: [{ participantId: 'p1', value: 200 }],
        },
      })
      const shares = calculateExpenseShares(expense, participants, families, 'individuals')
      expect(shares.get('f1')).toBe(400)
      expect(shares.get('p1')).toBe(200)
    })
  })
})

// ─── calculateBalances ────────────────────────────────────────────
describe('calculateBalances', () => {
  const alice = buildParticipant({ id: 'p1', name: 'Alice' })
  const bob = buildParticipant({ id: 'p2', name: 'Bob' })
  const participants = [alice, bob]
  const families: Family[] = []

  it('initializes all entities with zero balances when no expenses', () => {
    const result = calculateBalances([], participants, families, 'individuals')
    expect(result.balances).toHaveLength(2)
    expect(result.totalExpenses).toBe(0)
    result.balances.forEach(b => {
      expect(b.totalPaid).toBe(0)
      expect(b.totalShare).toBe(0)
      expect(b.balance).toBe(0)
    })
  })

  it('credits payer and debits shares correctly', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances([expense], participants, families, 'individuals')
    const aliceBalance = result.balances.find(b => b.id === 'p1')!
    const bobBalance = result.balances.find(b => b.id === 'p2')!

    expect(aliceBalance.totalPaid).toBe(100)
    expect(aliceBalance.totalShare).toBe(50)
    expect(aliceBalance.balance).toBe(50)  // owed 50

    expect(bobBalance.totalPaid).toBe(0)
    expect(bobBalance.totalShare).toBe(50)
    expect(bobBalance.balance).toBe(-50) // owes 50
  })

  it('applies currency conversion', () => {
    const expense = buildExpense({
      amount: 200,
      currency: 'USD',
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances(
      [expense], participants, families, 'individuals',
      [], 'EUR', { USD: 1.1 }
    )
    const converted = 200 / 1.1
    expect(result.totalExpenses).toBeCloseTo(converted, 2)
  })

  it('applies settlements to balances', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    // Bob pays Alice 50 to settle up
    const settlement = buildSettlement({
      from_participant_id: 'p2',
      to_participant_id: 'p1',
      amount: 50,
      currency: 'EUR',
    })
    const result = calculateBalances(
      [expense], participants, families, 'individuals', [settlement]
    )
    const aliceBalance = result.balances.find(b => b.id === 'p1')!
    const bobBalance = result.balances.find(b => b.id === 'p2')!

    // Alice: paid 100, share 50, balance = 50, settlement -50 => 0
    // But settlement changes: Alice receives 50 so balance decreases by 50
    // Bob: paid 0, share 50, balance = -50, settlement +50 => 0
    expect(aliceBalance.balance).toBeCloseTo(0, 2)
    expect(bobBalance.balance).toBeCloseTo(0, 2)
  })

  it('sorts by balance descending', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances([expense], participants, families, 'individuals')
    expect(result.balances[0].balance).toBeGreaterThanOrEqual(result.balances[1].balance)
  })

  it('calculates totalExpenses', () => {
    const expenses = [
      buildExpense({ amount: 100 }),
      buildExpense({ amount: 200 }),
    ]
    const result = calculateBalances(expenses, participants, families, 'individuals')
    expect(result.totalExpenses).toBe(300)
  })

  it('suggests the participant with the lowest balance as next payer', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances([expense], participants, families, 'individuals')
    expect(result.suggestedNextPayer?.id).toBe('p2') // Bob owes the most
  })

  it('handles families tracking mode with standalone participants', () => {
    const famP1 = buildParticipant({ id: 'fp1', name: 'FamAlice', family_id: 'f1' })
    const standalone = buildParticipant({ id: 'sp1', name: 'Standalone', family_id: null })
    const fam = buildFamily({ id: 'f1', family_name: 'Smith', adults: 2, children: 0 })

    const expense = buildExpense({
      amount: 90,
      paid_by: 'fp1',
      distribution: { type: 'families', families: ['f1'] },
    })

    const result = calculateBalances(
      [expense], [famP1, standalone], [fam], 'families'
    )
    // Should have entries for family f1 and standalone sp1
    expect(result.balances.some(b => b.id === 'f1')).toBe(true)
    expect(result.balances.some(b => b.id === 'sp1')).toBe(true)
  })
})

// ─── getBalanceForEntity ──────────────────────────────────────────
describe('getBalanceForEntity', () => {
  const balances = [
    { id: 'p1', name: 'Alice', totalPaid: 100, totalShare: 50, balance: 50, isFamily: false },
  ]

  it('returns balance when entity is found', () => {
    expect(getBalanceForEntity('p1', balances)).toEqual(balances[0])
  })

  it('returns null when entity is not found', () => {
    expect(getBalanceForEntity('p99', balances)).toBeNull()
  })
})

// ─── formatBalance ────────────────────────────────────────────────
describe('formatBalance', () => {
  it('formats positive balance with + prefix', () => {
    const formatted = formatBalance(50, 'EUR')
    expect(formatted).toMatch(/^\+/)
    expect(formatted).toContain('50')
  })

  it('formats negative balance with - prefix', () => {
    const formatted = formatBalance(-50, 'EUR')
    expect(formatted).toMatch(/^-/)
    expect(formatted).toContain('50')
  })

  it('formats zero balance without sign', () => {
    const formatted = formatBalance(0, 'EUR')
    expect(formatted).not.toMatch(/^[+-]/)
  })
})

// ─── getBalanceColorClass ─────────────────────────────────────────
describe('getBalanceColorClass', () => {
  it('returns green for positive balance', () => {
    expect(getBalanceColorClass(10)).toContain('green')
  })

  it('returns red for negative balance', () => {
    expect(getBalanceColorClass(-10)).toContain('red')
  })

  it('returns gray for zero balance', () => {
    expect(getBalanceColorClass(0)).toContain('gray')
  })
})
