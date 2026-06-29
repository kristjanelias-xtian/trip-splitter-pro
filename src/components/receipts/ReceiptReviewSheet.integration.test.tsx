// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { ReceiptReviewSheet } from './ReceiptReviewSheet'
import type { ExtractedItem, LegacyMappedItem } from '@/types/receipt'
import { buildParticipant, buildTrip } from '@/test/factories'

const aliceP = buildParticipant({ id: 'alice', name: 'Alice' })
const bobP = buildParticipant({ id: 'bob', name: 'Bob' })
const carolP = buildParticipant({ id: 'carol', name: 'Carol' })

vi.mock('@/contexts/ParticipantContext', () => ({
  useParticipantContext: () => ({
    participants: [aliceP, bobP, carolP],
    getAdultParticipants: () => [aliceP, bobP, carolP],
  }),
}))
vi.mock('@/contexts/ExpenseContext', () => ({
  useExpenseContext: () => ({
    createExpense: vi.fn(async () => ({ id: 'expense-1' })),
    updateExpense: vi.fn(),
    getExpenseById: vi.fn(),
  }),
}))
vi.mock('@/contexts/ReceiptContext', () => ({
  useReceiptContext: () => ({
    completeReceiptTask: vi.fn(async () => true),
    error: null,
    clearError: vi.fn(),
  }),
}))
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({ updateTrip: vi.fn() }),
}))
vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => ({ currentTrip: buildTrip({ id: 't1', default_currency: 'EUR' }) }),
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))
vi.mock('@/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => ({ isVisible: false, availableHeight: 0, viewportOffset: 0 }),
}))
vi.mock('@/hooks/useScrollIntoView', () => ({
  useScrollIntoView: () => {},
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
  },
}))

const items: ExtractedItem[] = [
  { id: 'beer', name: 'Beer', nameOriginal: 'Biere', price: 12, qty: 3 },
  { id: 'bread', name: 'Bread', nameOriginal: 'Bread', price: 4, qty: 1 },
  { id: 'wine', name: 'Wine', nameOriginal: 'Vin', price: 18, qty: 2 },
]

interface RenderProps {
  mappedItems?: Parameters<typeof ReceiptReviewSheet>[0]['mappedItems']
}

function renderSheet({ mappedItems }: RenderProps = {}) {
  return render(
    <ReceiptReviewSheet
      open={true}
      onOpenChange={() => {}}
      taskId="task-1"
      merchant="Test Restaurant"
      items={items}
      extractedTotal={34}
      currency="EUR"
      mappedItems={mappedItems ?? null}
      onDone={() => {}}
    />
  )
}

/**
 * Get the item-row container for the named item using the data-testid added to ItemRow.
 * Finds the row whose input has the given display value.
 */
function getItemRow(itemName: string): HTMLElement {
  const rows = screen.getAllByTestId('item-row')
  const match = rows.find(row => within(row).queryByDisplayValue(itemName) !== null)
  if (!match) throw new Error(`Could not find item-row for "${itemName}"`)
  return match
}

describe('ReceiptReviewSheet -- translations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows nameOriginal under name when they differ', async () => {
    renderSheet()
    // Beer has nameOriginal 'Biere' which differs from 'Beer'
    expect(await screen.findByText('Biere')).toBeInTheDocument()
    // Wine has nameOriginal 'Vin' which differs from 'Wine'
    expect(screen.getByText('Vin')).toBeInTheDocument()
  })

  it('does not show nameOriginal when it matches name', async () => {
    renderSheet()
    // Bread.name === Bread.nameOriginal, so the italic secondary line should not render
    // (the name itself appears in an input, the nameOriginal div is only shown when they differ)
    await screen.findByDisplayValue('Bread')
    const breadRow = getItemRow('Bread')
    // The only "Bread" text should be the input value; no additional italic line
    const italics = breadRow.querySelectorAll('div.italic')
    expect(italics).toHaveLength(0)
  })
})

describe('ReceiptReviewSheet -- multi-qty regression', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('spl1t:receipt-carry-forward', 'false')
    localStorage.setItem('spl1t:receipt-allocation-view', 'by-item')
  })

  it('allocating one beer to Alice does NOT change wine allocation when carry-forward is OFF', async () => {
    renderSheet()

    // First assign Carol a wine unit
    const wineRow = getItemRow('Wine')
    fireEvent.click(within(wineRow).getByLabelText(/Increment Carol/i))
    // Carol's count on wine should now be 1
    expect(within(wineRow).getByText('1')).toBeInTheDocument()

    // Now assign Alice a beer unit
    const beerRow = getItemRow('Beer')
    fireEvent.click(within(beerRow).getByLabelText(/Increment Alice/i))

    // Wine row's Carol count should still be 1 (carry-forward is off)
    const wineRowAfter = getItemRow('Wine')
    expect(within(wineRowAfter).getByText('1')).toBeInTheDocument()
  })
})

describe('ReceiptReviewSheet -- shared single-qty items (issue #783)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('spl1t:receipt-carry-forward', 'false')
    localStorage.setItem('spl1t:receipt-allocation-view', 'by-item')
  })

  it('lets multiple people share a qty=1 item (Bread), not just the first', () => {
    renderSheet()
    const breadRow = getItemRow('Bread') // qty=1 -> chip toggle mode

    // Select Alice, then Bob, then Carol on the same single-unit item.
    fireEvent.click(within(breadRow).getByText('Alice'))
    fireEvent.click(within(breadRow).getByText('Bob'))
    fireEvent.click(within(breadRow).getByText('Carol'))

    // All three must remain selected -> "Split between 3 people".
    expect(within(breadRow).getByText('Split between 3 people')).toBeInTheDocument()
  })

  it('"Everyone equally" on a qty>1 item selects every participant', () => {
    renderSheet()
    const wineRow = getItemRow('Wine') // qty=2, has the "Everyone equally" button
    fireEvent.click(within(wineRow).getByText(/Everyone equally/i))
    expect(within(wineRow).getByText('Split between 3 people')).toBeInTheDocument()
  })

  it('"Everyone equally" toggles off on a second click (deselects everyone)', () => {
    renderSheet()
    const wineRow = getItemRow('Wine')
    const btn = within(wineRow).getByText(/Everyone equally/i)
    fireEvent.click(btn)
    expect(within(wineRow).getByText('Split between 3 people')).toBeInTheDocument()
    // Second click clears the allocation -> no sharers, progress chip hidden.
    fireEvent.click(within(getItemRow('Wine')).getByText(/Everyone equally/i))
    expect(within(getItemRow('Wine')).queryByText('Split between 3 people')).not.toBeInTheDocument()
  })
})

describe('ReceiptReviewSheet -- view toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('preserves allocations when switching By Item -> By Person -> By Item', async () => {
    renderSheet()

    // Give Alice 2 beers
    const beerRow = getItemRow('Beer')
    fireEvent.click(within(beerRow).getByLabelText(/Increment Alice/i))
    fireEvent.click(within(beerRow).getByLabelText(/Increment Alice/i))
    // Alice should now show 2 on beer
    expect(within(beerRow).getByText('2')).toBeInTheDocument()

    // Switch to By Person
    fireEvent.click(screen.getByText('By Person'))

    // Alice's PersonRow should show "1 items" (1 item with allocation)
    expect(await screen.findByText('1 items')).toBeInTheDocument()

    // Switch back to By Item
    fireEvent.click(screen.getByText('By Item'))

    // Alice should still show count of 2 on Beer
    await waitFor(() => {
      const beerRowAfter = getItemRow('Beer')
      expect(within(beerRowAfter).getByText('2')).toBeInTheDocument()
    })
  })
})

describe('ReceiptReviewSheet -- carry-forward semantics', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('with carry-forward ON, allocating beer prefills subsequent items for same participants', async () => {
    localStorage.setItem('spl1t:receipt-carry-forward', 'true')
    renderSheet()

    // Assign Alice to beer (qty=3). Items are ordered: beer, bread, wine.
    // Carry-forward copies the source participant set onto later items with an
    // equal share weight of 1 each.
    const beerRow = getItemRow('Beer')
    fireEvent.click(within(beerRow).getByLabelText(/Increment Alice/i))

    // wine inherits the {alice} set with weight 1 (proportional shares, not units).
    await waitFor(() => {
      const wineRow = getItemRow('Wine')
      expect(within(wineRow).getByText('1')).toBeInTheDocument()
    })
  })

  it('with carry-forward OFF (default), allocating beer leaves wine untouched', async () => {
    // Default localStorage has no carry-forward key -> defaults to false
    renderSheet()

    const beerRow = getItemRow('Beer')
    fireEvent.click(within(beerRow).getByLabelText(/Increment Alice/i))

    // Wine row should have all counts at 0 for all three participants
    await waitFor(() => {
      const wineRow = getItemRow('Wine')
      const zeros = within(wineRow).getAllByText('0')
      // 3 participants x count displays = 3 zeros
      expect(zeros.length).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('ReceiptReviewSheet -- legacy mapped_items load', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads pre-redesign mapped_items (item_index + participant_ids)', async () => {
    const legacy: LegacyMappedItem[] = [
      { item_index: 0, participant_ids: ['alice', 'bob'] }, // beer (qty=3) -> alice=1, bob=1
      { item_index: 1, participant_ids: ['carol'] },         // bread (qty=1) -> carol=1
    ]
    renderSheet({ mappedItems: legacy })

    // Beer row should show counts of 1 for both alice and bob
    await waitFor(() => {
      const beerRow = getItemRow('Beer')
      // Both alice and bob get count=1 from legacy adapter (participant_ids each get count 1)
      const ones = within(beerRow).getAllByText('1')
      expect(ones.length).toBeGreaterThanOrEqual(2)
    })

    // Bread row should show carol with count 1
    const breadRow = getItemRow('Bread')
    // Bread has qty=1, so it uses chip-toggle mode (isSingleQty).
    // The carol chip will show as selected (on=true via getChipColor).
    // The count display is not shown for single-qty; verify via the sharer chip.
    expect(within(breadRow).getByText('Assigned to 1 person')).toBeInTheDocument()
  })
})
