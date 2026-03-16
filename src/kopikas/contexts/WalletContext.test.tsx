// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { WalletProvider, useWalletContext } from './WalletContext'
import type { Wallet, WalletTransaction } from '../types'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
vi.mock('@/lib/fetchWithTimeout', () => ({
  withTimeout: vi.fn((query: any) => query),
}))

const sampleWallet: Wallet = {
  id: 'wallet-1',
  wallet_code: 'test-abc123',
  name: "Aria's Wallet",
  currency: 'EUR',
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
}

const sampleTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    wallet_id: 'wallet-1',
    type: 'allowance',
    amount: 20,
    description: 'Weekly allowance',
    category: null,
    receipt_image_path: null,
    created_at: '2025-01-07T10:00:00Z',
  },
  {
    id: 'tx-2',
    wallet_id: 'wallet-1',
    type: 'expense',
    amount: 5,
    description: 'Sweets',
    category: 'sweets',
    receipt_image_path: null,
    created_at: '2025-01-08T12:00:00Z',
  },
  {
    id: 'tx-3',
    wallet_id: 'wallet-1',
    type: 'allowance',
    amount: 10,
    description: 'Bonus',
    category: null,
    receipt_image_path: null,
    created_at: '2025-01-09T10:00:00Z',
  },
]

/** Build wallet fetch chain: .select().eq().single().abortSignal() */
function mockWalletFetchChain(wallet: Wallet | null, fetchError: any = null) {
  return {
    select: () => ({
      eq: () => ({
        single: () => ({
          abortSignal: () => Promise.resolve({ data: wallet, error: fetchError }),
        }),
      }),
    }),
  }
}

/** Build transactions fetch chain: .select().eq().order().abortSignal() */
function mockTransactionFetchChain(transactions: WalletTransaction[], fetchError: any = null) {
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          abortSignal: () => Promise.resolve({ data: transactions, error: fetchError }),
        }),
      }),
    }),
  }
}

function TestConsumer() {
  const { wallet, transactions, loading, error, balance, lastAllowance } = useWalletContext()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="wallet-name">{wallet?.name ?? 'none'}</span>
      <span data-testid="tx-count">{transactions.length}</span>
      <span data-testid="balance">{balance}</span>
      <span data-testid="last-allowance">{lastAllowance?.description ?? 'none'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
    </div>
  )
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider walletCode="test-abc123">{children}</WalletProvider>
}

describe('WalletContext', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
  })

  it('shows loading state initially', () => {
    // Never resolves — keeps loading state visible
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => ({
            abortSignal: () => new Promise(() => {}),
          }),
        }),
      }),
    })

    render(<TestConsumer />, { wrapper })
    expect(screen.getByTestId('loading').textContent).toBe('true')
  })

  it('fetches wallet and transactions on mount', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      return mockTransactionFetchChain(sampleTransactions)
    })

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('wallet-name').textContent).toBe("Aria's Wallet")
    expect(screen.getByTestId('tx-count').textContent).toBe('3')
  })

  it('computes balance correctly: sum(allowances) - sum(expenses)', async () => {
    // Transactions: allowance 20, expense 5, allowance 10 → balance = 20 + 10 - 5 = 25
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      return mockTransactionFetchChain(sampleTransactions)
    })

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('balance').textContent).toBe('25')
  })

  it('computes balance as zero with no transactions', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      return mockTransactionFetchChain([])
    })

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('balance').textContent).toBe('0')
  })

  it('returns the first (most recent) allowance as lastAllowance', async () => {
    // sampleTransactions ordered by created_at desc: tx-3 (allowance), tx-2 (expense), tx-1 (allowance)
    // transactions are stored as returned (already desc), so first allowance found = tx-1 (index 0)
    const txOrderedDesc = [sampleTransactions[2], sampleTransactions[1], sampleTransactions[0]]

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      return mockTransactionFetchChain(txOrderedDesc)
    })

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    // First allowance in desc order is tx-3 (Bonus)
    expect(screen.getByTestId('last-allowance').textContent).toBe('Bonus')
  })

  it('returns null lastAllowance when no allowance transactions exist', async () => {
    const expenseOnly: WalletTransaction[] = [
      { ...sampleTransactions[1] }, // expense only
    ]

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      return mockTransactionFetchChain(expenseOnly)
    })

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('last-allowance').textContent).toBe('none')
  })

  it('sets error state when wallet fetch fails', async () => {
    mockSupabase.from.mockReturnValue(
      mockWalletFetchChain(null, { message: 'not found' })
    )

    render(<TestConsumer />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('error').textContent).toBe('Rahakotti ei leitud.')
    expect(screen.getByTestId('wallet-name').textContent).toBe('none')
  })

  it('addTransaction performs optimistic insert and replaces on success', async () => {
    let callCount = 0
    const savedTx: WalletTransaction = {
      id: 'tx-new',
      wallet_id: 'wallet-1',
      type: 'allowance',
      amount: 50,
      description: 'Birthday money',
      category: null,
      receipt_image_path: null,
      created_at: new Date().toISOString(),
    }

    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockWalletFetchChain(sampleWallet)
      if (callCount === 2) return mockTransactionFetchChain([])
      // addTransaction insert chain
      return {
        insert: () => ({
          select: () => ({
            single: () => ({
              abortSignal: () => Promise.resolve({ data: savedTx, error: null }),
            }),
          }),
        }),
      }
    })

    function AddButton() {
      const { addTransaction } = useWalletContext()
      return (
        <button
          data-testid="add-btn"
          onClick={() =>
            addTransaction({
              wallet_id: 'wallet-1',
              type: 'allowance',
              amount: 50,
              description: 'Birthday money',
            })
          }
        >
          Add
        </button>
      )
    }

    render(
      <WalletProvider walletCode="test-abc123">
        <TestConsumer />
        <AddButton />
      </WalletProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByTestId('add-btn').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('tx-count').textContent).toBe('1')
    })

    // The real saved tx should be present (not the optimistic one)
    expect(screen.getByTestId('balance').textContent).toBe('50')
  })
})
