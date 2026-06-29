// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonRow } from './PersonRow'
import type { Participant } from '@/types/participant'

const mkParticipant = (id: string, name: string): Participant => ({
  id,
  trip_id: 't1',
  name,
  email: null,
  is_adult: true,
  user_id: null,
  nickname: null,
  wallet_group: null,
})

const items = [
  { id: 'i1', name: 'Beer', price: 12, qty: 3 },
  { id: 'i2', name: 'Bread', price: 4, qty: 1 },
]

describe('PersonRow', () => {
  it('shows the participant name and item count', () => {
    const myCounts = new Map([['i1', 2]])
    const allCounts = new Map([['i1', new Map([['alice', 2]])]])
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={myCounts}
        allCounts={allCounts}
        currency="EUR"
        expanded={false}
        onToggleExpand={() => {}}
        onCountChange={() => {}}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/1 items?/)).toBeInTheDocument()
  })

  it('shows item rows with steppers when expanded', () => {
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={new Map([['i1', 1]])}
        allCounts={new Map([['i1', new Map([['alice', 1]])]])}
        currency="EUR"
        expanded={true}
        onToggleExpand={() => {}}
        onCountChange={() => {}}
      />
    )
    expect(screen.getByText('Beer')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
  })

  it('shows who an item is shared by when the user is not on it', () => {
    const allCounts = new Map([['i2', new Map([['bob', 1]])]])
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={new Map()}
        allCounts={allCounts}
        currency="EUR"
        expanded={true}
        onToggleExpand={() => {}}
        onCountChange={() => {}}
      />
    )
    expect(screen.getByText(/shared by 1/i)).toBeInTheDocument()
  })

  it('shows the participant proportional share for a shared item', () => {
    // Bread price 4 shared by alice + bob -> alice owes 2.00
    const allCounts = new Map([['i2', new Map([['alice', 1], ['bob', 1]])]])
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={new Map([['i2', 1]])}
        allCounts={allCounts}
        currency="EUR"
        expanded={true}
        onToggleExpand={() => {}}
        onCountChange={() => {}}
      />
    )
    expect(screen.getByText(/EUR 2\.00 . split 2 ways/i)).toBeInTheDocument()
  })

  it('never disables the + button (any number of people can share an item)', () => {
    const allCounts = new Map([['i2', new Map([['bob', 1]])]])
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={new Map()}
        allCounts={allCounts}
        currency="EUR"
        expanded={true}
        onToggleExpand={() => {}}
        onCountChange={() => {}}
      />
    )
    const plus = screen.getByLabelText(/Increment Bread for Alice/i)
    expect(plus).not.toBeDisabled()
  })

  it('calls onCountChange when + is clicked', () => {
    const onCountChange = vi.fn()
    render(
      <PersonRow
        participant={mkParticipant('alice', 'Alice')}
        items={items}
        myCounts={new Map()}
        allCounts={new Map()}
        currency="EUR"
        expanded={true}
        onToggleExpand={() => {}}
        onCountChange={onCountChange}
      />
    )
    fireEvent.click(screen.getByLabelText(/Increment Beer for Alice/i))
    expect(onCountChange).toHaveBeenCalledWith('i1', 1)
  })
})
