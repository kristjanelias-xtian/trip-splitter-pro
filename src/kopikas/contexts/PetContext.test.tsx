// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PetProvider } from './PetContext'
import { usePet } from '../hooks/usePet'
import type { WalletTransaction, WalletPet } from '../types'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

const existingPet: WalletPet = {
  wallet_id: 'w1',
  name: 'Bubbles',
  level: 1,
  xp: 0,
  starter_emoji: '🫧',
  last_weekly_xp_check: null,
  last_streak_xp_check: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const unnamedPet: WalletPet = {
  ...existingPet,
  name: null,
}

function makeTransaction(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
  return {
    id: 'tx-1',
    wallet_id: 'w1',
    type: 'expense',
    amount: 5,
    description: 'candy',
    category: 'sweets',
    receipt_image_path: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function TestConsumer() {
  const { pet, mood, isNamed, loading } = usePet()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="pet-name">{pet?.name ?? 'null'}</span>
      <span data-testid="mood-tier">{mood.tier}</span>
      <span data-testid="is-named">{String(isNamed)}</span>
    </div>
  )
}

function makeDefaultMock(pet: WalletPet | null) {
  // maybeSingle chain: .select().eq().maybeSingle().abortSignal()
  mockSupabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => ({
          abortSignal: () => Promise.resolve({ data: pet, error: null }),
        }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: existingPet, error: null }),
      }),
    }),
  })
}

describe('PetContext', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
  })

  it('mood is computed from transactions — no transactions yields neutral mood', async () => {
    makeDefaultMock(existingPet)

    render(
      <PetProvider walletId="w1" transactions={[]}>
        <TestConsumer />
      </PetProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    // No transactions → loggingConsistency=0.5 (neutral default), balanceHealth=0.5, categoryDiversity=0.5
    // score = 0.5 → tier='neutral'
    expect(screen.getByTestId('mood-tier').textContent).toBe('neutral')
  })

  it('mood reflects transactions — healthy balance yields positive mood', async () => {
    makeDefaultMock(existingPet)

    // Allowance + small expense = healthy balance, recent logging
    const now = new Date()
    const transactions: WalletTransaction[] = [
      makeTransaction({ id: 'tx-a', type: 'allowance', amount: 100, created_at: now.toISOString() }),
      makeTransaction({ id: 'tx-1', type: 'expense', amount: 10, category: 'food', created_at: now.toISOString() }),
      makeTransaction({ id: 'tx-2', type: 'expense', amount: 5, category: 'sweets', created_at: now.toISOString() }),
      makeTransaction({ id: 'tx-3', type: 'expense', amount: 3, category: 'fun', created_at: now.toISOString() }),
    ]

    render(
      <PetProvider walletId="w1" transactions={transactions}>
        <TestConsumer />
      </PetProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    const tier = screen.getByTestId('mood-tier').textContent
    expect(['ecstatic', 'happy']).toContain(tier)
  })

  it('isNamed is true when pet has a name', async () => {
    makeDefaultMock(existingPet)

    render(
      <PetProvider walletId="w1" transactions={[]}>
        <TestConsumer />
      </PetProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('is-named').textContent).toBe('true')
    expect(screen.getByTestId('pet-name').textContent).toBe('Bubbles')
  })

  it('isNamed is false when pet.name is null', async () => {
    makeDefaultMock(unnamedPet)

    render(
      <PetProvider walletId="w1" transactions={[]}>
        <TestConsumer />
      </PetProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('is-named').textContent).toBe('false')
    expect(screen.getByTestId('pet-name').textContent).toBe('null')
  })

  it('renders with null walletId without crashing', async () => {
    render(
      <PetProvider walletId={null} transactions={[]}>
        <TestConsumer />
      </PetProvider>
    )

    // No fetch is made — loading stays false, pet stays null
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('pet-name').textContent).toBe('null')
  })
})
