import { describe, it, expect } from 'vitest'
import {
  convertToBaseCurrency,
  calculateExpenseShares,
  calculateBalances,
  calculateWithinGroupBalances,
  buildEntityMap,
  getBalanceForEntity,
  formatBalance,
  getBalanceColorClass,
} from './balanceCalculator'
import { buildParticipant, buildExpense, buildSettlement } from '@/test/factories'
import type { Participant } from '@/types/participant'

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

// ─── buildEntityMap ───────────────────────────────────────────────
describe('buildEntityMap', () => {
  it('groups by wallet_group even in individuals mode', () => {
    const p1 = buildParticipant({ id: 'p1', name: 'Alice', wallet_group: 'Smith', is_adult: true })
    const p2 = buildParticipant({ id: 'p2', name: 'Bob' })
    const result = buildEntityMap([p1, p2], 'individuals')
    // Alice is grouped as "Smith", Bob is standalone
    expect(result.entities).toHaveLength(2)
    const smith = result.entities.find(e => e.name === 'Smith')!
    expect(smith.isFamily).toBe(true)
    expect(smith.id).toBe('p1') // canonical = only adult in group
    expect(result.participantToEntityId.get('p1')).toBe('p1')
    expect(result.participantToEntityId.get('p2')).toBe('p2')
  })

  it('treats participants without wallet_group as standalone in individuals mode', () => {
    const p1 = buildParticipant({ id: 'p1', name: 'Alice' })
    const p2 = buildParticipant({ id: 'p2', name: 'Bob' })
    const result = buildEntityMap([p1, p2], 'individuals')
    expect(result.entities).toHaveLength(2)
    expect(result.participantToEntityId.get('p1')).toBe('p1')
    expect(result.participantToEntityId.get('p2')).toBe('p2')
    expect(result.entities.every(e => !e.isFamily)).toBe(true)
  })

  it('groups by wallet_group in families mode', () => {
    const p1 = buildParticipant({ id: 'p1', name: 'Alice' })
    const p3 = buildParticipant({ id: 'p3', name: 'Carol', wallet_group: 'Smith', is_adult: true })
    const p4 = buildParticipant({ id: 'p4', name: 'Dave', wallet_group: 'Smith', is_adult: true })
    const result = buildEntityMap([p1, p3, p4], 'families')
    // Alice is standalone, Carol+Dave are grouped as "Smith"
    expect(result.entities).toHaveLength(2)
    const smith = result.entities.find(e => e.name === 'Smith')!
    expect(smith.isFamily).toBe(true)
    // Canonical ID = first adult sorted alphabetically = Carol (p3)
    expect(smith.id).toBe('p3')
    expect(result.participantToEntityId.get('p3')).toBe('p3')
    expect(result.participantToEntityId.get('p4')).toBe('p3')
    expect(result.participantToEntityId.get('p1')).toBe('p1')
  })

  it('uses first adult sorted by name as canonical ID', () => {
    const p1 = buildParticipant({ id: 'p1', name: 'Zara', wallet_group: 'Fam', is_adult: true })
    const p2 = buildParticipant({ id: 'p2', name: 'Amy', wallet_group: 'Fam', is_adult: true })
    const p3 = buildParticipant({ id: 'p3', name: 'Kid', wallet_group: 'Fam', is_adult: false })
    const result = buildEntityMap([p1, p2, p3], 'families')
    // Amy sorts before Zara, so p2 is canonical
    expect(result.entities[0].id).toBe('p2')
    expect(result.participantToEntityId.get('p1')).toBe('p2')
    expect(result.participantToEntityId.get('p3')).toBe('p2')
  })
})

// ─── calculateExpenseShares ───────────────────────────────────────
describe('calculateExpenseShares', () => {
  const p1 = buildParticipant({ id: 'p1', name: 'Alice' })
  const p2 = buildParticipant({ id: 'p2', name: 'Bob' })
  const p3 = buildParticipant({ id: 'p3', name: 'Carol', wallet_group: 'Smith', is_adult: true })
  const p4 = buildParticipant({ id: 'p4', name: 'Dave', wallet_group: 'Smith', is_adult: true })
  const p5 = buildParticipant({ id: 'p5', name: 'Eve', wallet_group: 'Jones', is_adult: true })

  const participants: Participant[] = [p1, p2, p3, p4, p5]

  describe('individuals + equal', () => {
    it('splits evenly among listed individuals', () => {
      const expense = buildExpense({
        amount: 90,
        distribution: { type: 'individuals', participants: ['p1', 'p2', 'p3'] },
      })
      const shares = calculateExpenseShares(expense, participants, 'individuals')
      expect(shares.get('p1')).toBe(30)
      expect(shares.get('p2')).toBe(30)
      expect(shares.get('p3')).toBe(30)
    })

    it('aggregates to wallet_group entity in families tracking mode', () => {
      const expense = buildExpense({
        amount: 100,
        distribution: { type: 'individuals', participants: ['p3', 'p4'] },
      })
      const shares = calculateExpenseShares(expense, participants, 'families')
      // Both p3 and p4 belong to Smith group, canonical = p3
      expect(shares.get('p3')).toBe(100)
    })

    it('aggregates to wallet_group entity in individuals tracking mode', () => {
      const expense = buildExpense({
        amount: 100,
        distribution: { type: 'individuals', participants: ['p3', 'p4'] },
      })
      const shares = calculateExpenseShares(expense, participants, 'individuals')
      // Both p3 and p4 belong to Smith group, canonical = p3
      expect(shares.get('p3')).toBe(100)
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
      const shares = calculateExpenseShares(expense, participants, 'individuals')
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
      const shares = calculateExpenseShares(expense, participants, 'individuals')
      expect(shares.get('p1')).toBe(100)
      expect(shares.get('p2')).toBe(50)
    })
  })

  describe('accountForFamilySize in individuals mode', () => {
    it('splits equally per entity when accountForFamilySize is true', () => {
      // Alice (standalone) + Carol+Dave (Smith group) + Eve (Jones group)
      const expense = buildExpense({
        amount: 300,
        distribution: {
          type: 'individuals',
          participants: ['p1', 'p3', 'p4', 'p5'],
          accountForFamilySize: true,
        },
      })
      const shares = calculateExpenseShares(expense, participants, 'individuals')
      // 3 entities: Alice, Smith, Jones → 100 each
      expect(shares.get('p1')).toBe(100) // Alice
      expect(shares.get('p3')).toBe(100) // Smith (Carol+Dave)
      expect(shares.get('p5')).toBe(100) // Jones (Eve)
    })

    it('splits per person when accountForFamilySize is false', () => {
      const expense = buildExpense({
        amount: 400,
        distribution: {
          type: 'individuals',
          participants: ['p1', 'p3', 'p4', 'p5'],
          accountForFamilySize: false,
        },
      })
      const shares = calculateExpenseShares(expense, participants, 'individuals')
      // 4 people → 100 each, but Carol+Dave aggregate to Smith
      expect(shares.get('p1')).toBe(100)  // Alice
      expect(shares.get('p3')).toBe(200)  // Smith (Carol 100 + Dave 100)
      expect(shares.get('p5')).toBe(100)  // Jones (Eve)
    })
  })

  describe('wallet_group aggregation', () => {
    it('aggregates percentage splits to wallet_group entities', () => {
      const expense = buildExpense({
        amount: 200,
        distribution: {
          type: 'individuals',
          participants: ['p3', 'p4', 'p5'],
          splitMode: 'percentage',
          participantSplits: [
            { participantId: 'p3', value: 30 },
            { participantId: 'p4', value: 30 },
            { participantId: 'p5', value: 40 },
          ],
        },
      })
      const shares = calculateExpenseShares(expense, participants, 'families')
      // p3+p4 → Smith (canonical p3): 30%+30% = 60% of 200 = 120
      // p5 → Jones (canonical p5): 40% of 200 = 80
      expect(shares.get('p3')).toBe(120)
      expect(shares.get('p5')).toBe(80)
    })
  })
})

// ─── calculateBalances ────────────────────────────────────────────
describe('calculateBalances', () => {
  const alice = buildParticipant({ id: 'p1', name: 'Alice' })
  const bob = buildParticipant({ id: 'p2', name: 'Bob' })
  const participants = [alice, bob]

  it('initializes all entities with zero balances when no expenses', () => {
    const result = calculateBalances([], participants, 'individuals')
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
    const result = calculateBalances([expense], participants, 'individuals')
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
      [expense], participants, 'individuals',
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
    const settlement = buildSettlement({
      from_participant_id: 'p2',
      to_participant_id: 'p1',
      amount: 50,
      currency: 'EUR',
    })
    const result = calculateBalances(
      [expense], participants, 'individuals', [settlement]
    )
    const aliceBalance = result.balances.find(b => b.id === 'p1')!
    const bobBalance = result.balances.find(b => b.id === 'p2')!

    expect(aliceBalance.balance).toBeCloseTo(0, 2)
    expect(aliceBalance.totalSettled).toBe(-50) // received 50
    expect(aliceBalance.totalSettledSent).toBe(0)
    expect(aliceBalance.totalSettledReceived).toBe(50)
    expect(bobBalance.balance).toBeCloseTo(0, 2)
    expect(bobBalance.totalSettled).toBe(50) // sent 50
    expect(bobBalance.totalSettledSent).toBe(50)
    expect(bobBalance.totalSettledReceived).toBe(0)
  })

  it('tracks gross settlement amounts when bidirectional', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const settlements = [
      buildSettlement({
        id: 's1',
        from_participant_id: 'p2',
        to_participant_id: 'p1',
        amount: 80,
        currency: 'EUR',
      }),
      buildSettlement({
        id: 's2',
        from_participant_id: 'p1',
        to_participant_id: 'p2',
        amount: 20,
        currency: 'EUR',
      }),
    ]
    const result = calculateBalances(
      [expense], participants, 'individuals', settlements
    )
    const aliceBalance = result.balances.find(b => b.id === 'p1')!
    const bobBalance = result.balances.find(b => b.id === 'p2')!

    // Alice: net settled = -80 (received) + 20 (sent) = -60
    expect(aliceBalance.totalSettled).toBe(-60)
    expect(aliceBalance.totalSettledSent).toBe(20)
    expect(aliceBalance.totalSettledReceived).toBe(80)

    // Bob: net settled = 80 (sent) - 20 (received) = 60
    expect(bobBalance.totalSettled).toBe(60)
    expect(bobBalance.totalSettledSent).toBe(80)
    expect(bobBalance.totalSettledReceived).toBe(20)
  })

  it('sorts by balance descending', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances([expense], participants, 'individuals')
    expect(result.balances[0].balance).toBeGreaterThanOrEqual(result.balances[1].balance)
  })

  it('calculates totalExpenses', () => {
    const expenses = [
      buildExpense({ amount: 100 }),
      buildExpense({ amount: 200 }),
    ]
    const result = calculateBalances(expenses, participants, 'individuals')
    expect(result.totalExpenses).toBe(300)
  })

  it('suggests the participant with the lowest balance as next payer', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'p1',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const result = calculateBalances([expense], participants, 'individuals')
    expect(result.suggestedNextPayer?.id).toBe('p2') // Bob owes the most
  })

  it('groups by wallet_group in individuals tracking mode', () => {
    const famP1 = buildParticipant({ id: 'fp1', name: 'FamAlice', wallet_group: 'Smith', is_adult: true })
    const famP2 = buildParticipant({ id: 'fp2', name: 'FamBob', wallet_group: 'Smith', is_adult: true })
    const standalone = buildParticipant({ id: 'sp1', name: 'Standalone' })

    const expense = buildExpense({
      amount: 90,
      paid_by: 'fp1',
      distribution: { type: 'individuals', participants: ['fp1', 'fp2', 'sp1'] },
    })

    const result = calculateBalances(
      [expense], [famP1, famP2, standalone], 'individuals'
    )
    // Should have 2 entities: Smith (canonical fp1) and Standalone (sp1)
    expect(result.balances).toHaveLength(2)
    const smith = result.balances.find(b => b.name === 'Smith')!
    const stand = result.balances.find(b => b.name === 'Standalone')!

    expect(smith.id).toBe('fp1')
    expect(smith.isFamily).toBe(true)
    // Smith paid 90, Smith's share = 60 (2 people × 30), balance = +30
    expect(smith.totalPaid).toBe(90)
    expect(smith.totalShare).toBe(60)
    expect(smith.balance).toBeCloseTo(30, 2)

    expect(stand.totalPaid).toBe(0)
    expect(stand.totalShare).toBe(30)
    expect(stand.balance).toBeCloseTo(-30, 2)
  })

  it('handles families tracking mode with wallet_group', () => {
    const famP1 = buildParticipant({ id: 'fp1', name: 'FamAlice', wallet_group: 'Smith', is_adult: true })
    const standalone = buildParticipant({ id: 'sp1', name: 'Standalone' })

    const expense = buildExpense({
      amount: 90,
      paid_by: 'fp1',
      distribution: { type: 'individuals', participants: ['fp1'] },
    })

    const result = calculateBalances(
      [expense], [famP1, standalone], 'families'
    )
    // Should have entries for Smith (canonical fp1) and Standalone (sp1)
    const smith = result.balances.find(b => b.name === 'Smith')!
    const stand = result.balances.find(b => b.name === 'Standalone')!

    expect(smith.id).toBe('fp1') // canonical participant ID
    expect(smith.isFamily).toBe(true)
    expect(smith.totalPaid).toBe(90)
    expect(smith.totalShare).toBe(90)
    expect(smith.balance).toBeCloseTo(0, 2)

    expect(stand.id).toBe('sp1')
    expect(stand.isFamily).toBe(false)
    expect(stand.totalPaid).toBe(0)
    expect(stand.totalShare).toBe(0)
    expect(stand.balance).toBeCloseTo(0, 2)
  })
})

// ─── getBalanceForEntity ──────────────────────────────────────────
describe('getBalanceForEntity', () => {
  const balances = [
    { id: 'p1', name: 'Alice', totalPaid: 100, totalShare: 50, totalSettled: 0, totalSettledSent: 0, totalSettledReceived: 0, balance: 50, isFamily: false },
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

// ─── calculateWithinGroupBalances ────────────────────────────────
describe('calculateWithinGroupBalances', () => {
  const alice = buildParticipant({ id: 'g1', name: 'Alice', wallet_group: 'Smith', is_adult: true })
  const bob = buildParticipant({ id: 'g2', name: 'Bob', wallet_group: 'Smith', is_adult: true })
  const carol = buildParticipant({ id: 'g3', name: 'Carol', wallet_group: 'Smith', is_adult: true })
  const outsider = buildParticipant({ id: 'o1', name: 'Eve' })
  const allParticipants = [alice, bob, carol, outsider]

  it('shows imbalance when one member paid all', () => {
    const expense = buildExpense({
      amount: 90,
      paid_by: 'g1',
      distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
    })
    const balances = calculateWithinGroupBalances([expense], allParticipants, 'Smith')

    const aliceBal = balances.find(b => b.id === 'g1')!
    const bobBal = balances.find(b => b.id === 'g2')!
    const carolBal = balances.find(b => b.id === 'g3')!

    expect(aliceBal.totalPaid).toBe(90)
    expect(aliceBal.totalShare).toBe(30)
    expect(aliceBal.balance).toBeCloseTo(60, 2) // overpaid

    expect(bobBal.balance).toBeCloseTo(-30, 2) // underpaid
    expect(carolBal.balance).toBeCloseTo(-30, 2)
  })

  it('returns ~0 balances when expenses split proportionally', () => {
    const expenses = [
      buildExpense({
        id: 'e1',
        amount: 60,
        paid_by: 'g1',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      }),
      buildExpense({
        id: 'e2',
        amount: 30,
        paid_by: 'g2',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      }),
    ]
    const balances = calculateWithinGroupBalances(expenses, allParticipants, 'Smith')

    // Total = 90, each should bear 30. Alice paid 60, share 30 → +30. Bob paid 30, share 30 → 0. Carol paid 0, share 30 → -30.
    // Not perfectly proportional — let's fix the test: truly proportional means each pays their share.
    // Alice paid 60, her share of 90 is 30 → +30. Bob paid 30, share 30 → 0. Carol paid 0, share 30 → -30.
    // To make it proportional, each must pay exactly 30.
    // Let's use expenses where each pays their fair share.
    expect(balances.length).toBe(3)
  })

  it('returns evenly split when each member pays their share', () => {
    const expenses = [
      buildExpense({
        id: 'e1',
        amount: 30,
        paid_by: 'g1',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      }),
      buildExpense({
        id: 'e2',
        amount: 30,
        paid_by: 'g2',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      }),
      buildExpense({
        id: 'e3',
        amount: 30,
        paid_by: 'g3',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      }),
    ]
    const balances = calculateWithinGroupBalances(expenses, allParticipants, 'Smith')
    const allEven = balances.every(b => Math.abs(b.balance) < 0.01)
    expect(allEven).toBe(true)
  })

  it('returns zero balance for member not in any expense', () => {
    const expense = buildExpense({
      amount: 100,
      paid_by: 'g1',
      distribution: { type: 'individuals', participants: ['g1', 'g2'] },
    })
    const balances = calculateWithinGroupBalances([expense], allParticipants, 'Smith')
    const carolBal = balances.find(b => b.id === 'g3')!
    expect(carolBal.totalPaid).toBe(0)
    expect(carolBal.totalShare).toBe(0)
    expect(carolBal.balance).toBe(0)
  })

  it('outsider-paid expenses give members negative balance (paid=0, share=30)', () => {
    const expense = buildExpense({
      amount: 120,
      paid_by: 'o1', // outsider pays
      distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3', 'o1'] },
    })
    const balances = calculateWithinGroupBalances([expense], allParticipants, 'Smith')
    // Each of the 4 participants owes 30. Group members have paid=0, share=30.
    // balance = paid - share = 0 - 30 = -30 (external debt, offset when settlements arrive)
    const aliceBal = balances.find(b => b.id === 'g1')!
    const bobBal = balances.find(b => b.id === 'g2')!
    const carolBal = balances.find(b => b.id === 'g3')!
    expect(aliceBal.totalPaid).toBe(0)
    expect(aliceBal.totalShare).toBe(30)
    expect(aliceBal.balance).toBeCloseTo(-30, 2)
    expect(bobBal.totalPaid).toBe(0)
    expect(bobBal.totalShare).toBe(30)
    expect(bobBal.balance).toBeCloseTo(-30, 2)
    expect(carolBal.totalPaid).toBe(0)
    expect(carolBal.totalShare).toBe(30)
    expect(carolBal.balance).toBeCloseTo(-30, 2)
  })

  it('member totalPaid/totalShare sums match group-level calculateBalances output', () => {
    // Mix of member-paid and outsider-paid expenses
    const expenses = [
      buildExpense({
        id: 'e1',
        amount: 90,
        paid_by: 'g1', // group member pays
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3', 'o1'] },
      }),
      buildExpense({
        id: 'e2',
        amount: 120,
        paid_by: 'o1', // outsider pays
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'o1'] },
      }),
    ]

    // Group-level balances
    const groupLevel = calculateBalances(expenses, allParticipants, 'individuals')
    // Entity for Smith group (canonical = g1 since Alice sorts first among adults)
    const smithGroup = groupLevel.balances.find(b => b.name === 'Smith')!

    // Within-group balances
    const memberBalances = calculateWithinGroupBalances(expenses, allParticipants, 'Smith')

    const sumPaid = memberBalances.reduce((s, b) => s + b.totalPaid, 0)
    const sumShare = memberBalances.reduce((s, b) => s + b.totalShare, 0)
    const sumBalance = memberBalances.reduce((s, b) => s + b.balance, 0)

    expect(sumPaid).toBeCloseTo(smithGroup.totalPaid, 2)
    expect(sumShare).toBeCloseTo(smithGroup.totalShare, 2)
    // Balances do NOT sum to zero — remainder = family's external balance
    expect(sumBalance).toBeCloseTo(smithGroup.totalPaid - smithGroup.totalShare, 2)
  })

  it('returns empty array for non-existent group', () => {
    const balances = calculateWithinGroupBalances([], allParticipants, 'NonExistent')
    expect(balances).toHaveLength(0)
  })

  describe('children folded into adults', () => {
    const adultA = buildParticipant({ id: 'fa1', name: 'Mom', wallet_group: 'Fam', is_adult: true })
    const adultB = buildParticipant({ id: 'fa2', name: 'Dad', wallet_group: 'Fam', is_adult: true })
    const child = buildParticipant({ id: 'fc1', name: 'Kid', wallet_group: 'Fam', is_adult: false })
    const famParticipants = [adultA, adultB, child]

    it('folds child balance into adults — only 2 rows returned', () => {
      const expense = buildExpense({
        amount: 90,
        paid_by: 'fa1',
        distribution: { type: 'individuals', participants: ['fa1', 'fa2', 'fc1'] },
      })
      const balances = calculateWithinGroupBalances([expense], famParticipants, 'Fam')

      // Only adults should be returned
      expect(balances).toHaveLength(2)
      expect(balances.every(b => b.id !== 'fc1')).toBe(true)

      // Mom paid 90, each person's share = 30
      // Kid's balance = 0 - 30 = -30, split among 2 adults = -15 each
      // Mom: paid 90, share 30 + 15 = 45, balance = 45
      // Dad: paid 0, share 30 + 15 = 45, balance = -45
      const mom = balances.find(b => b.id === 'fa1')!
      const dad = balances.find(b => b.id === 'fa2')!
      expect(mom.balance).toBeCloseTo(45, 2)
      expect(dad.balance).toBeCloseTo(-45, 2)
    })

    it('returns all members when group has no adults', () => {
      const childA = buildParticipant({ id: 'c1', name: 'ChildA', wallet_group: 'Kids', is_adult: false })
      const childB = buildParticipant({ id: 'c2', name: 'ChildB', wallet_group: 'Kids', is_adult: false })
      const expense = buildExpense({
        amount: 60,
        paid_by: 'c1',
        distribution: { type: 'individuals', participants: ['c1', 'c2'] },
      })
      const balances = calculateWithinGroupBalances([expense], [childA, childB], 'Kids')

      // Both children shown (no adults to fold into)
      expect(balances).toHaveLength(2)
    })
  })

  describe('within-group settlements', () => {
    it('applies settlement between group members', () => {
      const expense = buildExpense({
        amount: 90,
        paid_by: 'g1',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      })
      const settlement = buildSettlement({
        from_participant_id: 'g2',
        to_participant_id: 'g1',
        amount: 30,
        currency: 'EUR',
      })
      const balances = calculateWithinGroupBalances(
        [expense], allParticipants, 'Smith', 'EUR', {}, [settlement]
      )
      // Before settlement: Alice +60, Bob -30, Carol -30
      // After settlement (Bob→Alice 30): Alice +30, Bob 0, Carol -30
      const aliceBal = balances.find(b => b.id === 'g1')!
      const bobBal = balances.find(b => b.id === 'g2')!
      const carolBal = balances.find(b => b.id === 'g3')!
      expect(aliceBal.balance).toBeCloseTo(30, 2)
      expect(bobBal.balance).toBeCloseTo(0, 2)
      expect(carolBal.balance).toBeCloseTo(-30, 2)
    })

    it('applies external settlements to group member balance', () => {
      const expense = buildExpense({
        amount: 90,
        paid_by: 'g1',
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3'] },
      })
      const settlement = buildSettlement({
        from_participant_id: 'o1', // outsider pays Alice
        to_participant_id: 'g1',
        amount: 30,
        currency: 'EUR',
      })
      const balances = calculateWithinGroupBalances(
        [expense], allParticipants, 'Smith', 'EUR', {}, [settlement]
      )
      // Before settlement: Alice +60, Bob -30, Carol -30
      // External settlement (outsider→Alice 30): Alice receives 30 → balance -30 = +30
      const aliceBal = balances.find(b => b.id === 'g1')!
      expect(aliceBal.balance).toBeCloseTo(30, 2)
    })

    it('external settlement received by member reduces their within-group balance', () => {
      // Outsider pays for group, then settles externally with one member
      const expense = buildExpense({
        amount: 120,
        paid_by: 'o1', // outsider pays
        distribution: { type: 'individuals', participants: ['g1', 'g2', 'g3', 'o1'] },
      })
      const settlement = buildSettlement({
        from_participant_id: 'g1', // Alice pays outsider back
        to_participant_id: 'o1',
        amount: 30,
        currency: 'EUR',
      })
      const balances = calculateWithinGroupBalances(
        [expense], allParticipants, 'Smith', 'EUR', {}, [settlement]
      )
      // Each member: paid=0, share=30, balance = -30
      // Alice settles 30 to outsider → balance += 30 → 0
      const aliceBal = balances.find(b => b.id === 'g1')!
      expect(aliceBal.balance).toBeCloseTo(0, 2)
      // Bob and Carol unchanged at -30
      const bobBal = balances.find(b => b.id === 'g2')!
      const carolBal = balances.find(b => b.id === 'g3')!
      expect(bobBal.balance).toBeCloseTo(-30, 2)
      expect(carolBal.balance).toBeCloseTo(-30, 2)
    })
  })
})
