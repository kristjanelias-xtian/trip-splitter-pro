import { describe, it, expect, vi } from 'vitest'
import { buildTransactionHistory } from './transactionHistoryBuilder'
import { buildParticipant, buildExpense, buildSettlement } from '@/test/factories'

// Mock the balanceCalculator dependency
vi.mock('@/services/balanceCalculator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/balanceCalculator')>()
  return { ...actual }
})

describe('buildTransactionHistory', () => {
  const alice = buildParticipant({ id: 'p1', name: 'Alice' })
  const bob = buildParticipant({ id: 'p2', name: 'Bob' })
  const participants = [alice, bob]

  it('returns empty array with no expenses or settlements', () => {
    const result = buildTransactionHistory([], [], participants, alice, 'individuals')
    expect(result).toHaveLength(0)
  })

  it('marks expense as you_paid when user is the payer', () => {
    const expense = buildExpense({
      paid_by: 'p1',
      amount: 100,
      description: 'Dinner',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })

    const result = buildTransactionHistory(
      [expense], [], participants, alice, 'individuals'
    )

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('you_paid')
    expect(result[0].roleAmount).toBe(100)
    expect(result[0].myShare).toBe(50) // split between 2
  })

  it('marks expense as your_share when user has a share but did not pay', () => {
    const expense = buildExpense({
      paid_by: 'p2',
      amount: 100,
      description: 'Lunch',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })

    const result = buildTransactionHistory(
      [expense], [], participants, alice, 'individuals'
    )

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('your_share')
    expect(result[0].roleAmount).toBe(50) // Alice's share
    expect(result[0].payerName).toBe('Bob')
  })

  it('excludes expense when user is irrelevant (not payer, no share)', () => {
    const carol = buildParticipant({ id: 'p3', name: 'Carol' })
    const expense = buildExpense({
      paid_by: 'p2',
      distribution: { type: 'individuals', participants: ['p2', 'p3'] },
    })

    const result = buildTransactionHistory(
      [expense], [], [alice, bob, carol], alice, 'individuals'
    )
    expect(result).toHaveLength(0)
  })

  it('marks settlement as you_settled when user is the sender', () => {
    const settlement = buildSettlement({
      from_participant_id: 'p1',
      to_participant_id: 'p2',
      amount: 50,
      note: 'Settling up',
    })

    const result = buildTransactionHistory(
      [], [settlement], participants, alice, 'individuals'
    )

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('you_settled')
    expect(result[0].roleAmount).toBe(50)
    expect(result[0].recipientName).toBe('Bob')
  })

  it('marks settlement as you_received when user is the recipient', () => {
    const settlement = buildSettlement({
      from_participant_id: 'p2',
      to_participant_id: 'p1',
      amount: 30,
    })

    const result = buildTransactionHistory(
      [], [settlement], participants, alice, 'individuals'
    )

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('you_received')
    expect(result[0].roleAmount).toBe(30)
    expect(result[0].payerName).toBe('Bob')
  })

  it('sorts by date descending', () => {
    const expense1 = buildExpense({
      id: 'e1',
      paid_by: 'p1',
      expense_date: '2025-07-10',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })
    const expense2 = buildExpense({
      id: 'e2',
      paid_by: 'p1',
      expense_date: '2025-07-15',
      distribution: { type: 'individuals', participants: ['p1', 'p2'] },
    })

    const result = buildTransactionHistory(
      [expense1, expense2], [], participants, alice, 'individuals'
    )

    expect(result[0].date).toBe('2025-07-15')
    expect(result[1].date).toBe('2025-07-10')
  })

  it('resolves entity via wallet_group in families tracking mode', () => {
    const famAlice = buildParticipant({ id: 'fp1', name: 'Alice', wallet_group: 'AliceFamily', is_adult: true })
    const famBob = buildParticipant({ id: 'fp2', name: 'Bob', wallet_group: 'BobFamily', is_adult: true })

    const expense = buildExpense({
      paid_by: 'fp2',
      amount: 200,
      distribution: { type: 'individuals', participants: ['fp1', 'fp2'] },
    })

    const result = buildTransactionHistory(
      [expense], [], [famAlice, famBob], famAlice, 'families'
    )

    // Alice's family has a share, Bob paid
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('your_share')
  })
})
