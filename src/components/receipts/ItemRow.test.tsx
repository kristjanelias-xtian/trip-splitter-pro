// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemRow } from './ItemRow'
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

const baseItem = {
  id: 'i1',
  name: 'Cabbage soup',
  nameOriginal: 'Borscht',
  price: '24',
  qty: 4,
}

const participants = [mkParticipant('alice', 'Alice'), mkParticipant('bob', 'Bob')]

const shortNames = new Map([['alice', 'Alice'], ['bob', 'Bob']])

function noop() { /* no-op */ }

describe('ItemRow', () => {
  it('renders both names when nameOriginal differs from name', () => {
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={new Map()}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={noop}
      />
    )
    expect(screen.getByDisplayValue('Cabbage soup')).toBeInTheDocument()
    expect(screen.getByText('Borscht')).toBeInTheDocument()
  })

  it('omits the original-name line when name matches nameOriginal', () => {
    render(
      <ItemRow
        index={0}
        item={{ ...baseItem, nameOriginal: 'Cabbage soup' }}
        counts={new Map()}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={noop}
      />
    )
    expect(screen.queryByText('Borscht')).not.toBeInTheDocument()
  })

  it('shows progress chip with assigned/qty', () => {
    const counts = new Map([['alice', 1], ['bob', 1]])
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={counts}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={noop}
      />
    )
    expect(screen.getByText('2 of 4 assigned')).toBeInTheDocument()
  })

  it('disables the + button when item is fully assigned', () => {
    const counts = new Map([['alice', 4]])
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={counts}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={noop}
      />
    )
    const plus = screen.getAllByLabelText(/Increment/i)
    plus.forEach(btn => expect(btn).toBeDisabled())
  })

  it('disables the - button when count is 0 for that participant', () => {
    const counts = new Map([['alice', 0]])
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={counts}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={noop}
      />
    )
    const minusForAlice = screen.getByLabelText(/Decrement Alice/i)
    expect(minusForAlice).toBeDisabled()
  })

  it('calls onCountChange with delta +1 when + is clicked', () => {
    const onCountChange = vi.fn()
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={new Map()}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={onCountChange}
        onAssignEvenly={noop}
      />
    )
    fireEvent.click(screen.getByLabelText(/Increment Alice/i))
    expect(onCountChange).toHaveBeenCalledWith('alice', 1)
  })

  it('calls onAssignEvenly when "Everyone equally" is clicked', () => {
    const onAssignEvenly = vi.fn()
    render(
      <ItemRow
        index={0}
        item={baseItem}
        counts={new Map()}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={noop}
        onAssignEvenly={onAssignEvenly}
      />
    )
    fireEvent.click(screen.getByText(/Everyone equally/i))
    expect(onAssignEvenly).toHaveBeenCalled()
  })

  it('collapses to a tap-to-toggle chip when qty is 1', () => {
    const onCountChange = vi.fn()
    render(
      <ItemRow
        index={0}
        item={{ ...baseItem, qty: 1 }}
        counts={new Map()}
        participants={participants}
        shortNames={shortNames}
        onNameChange={noop}
        onPriceChange={noop}
        onCountChange={onCountChange}
        onAssignEvenly={noop}
      />
    )
    expect(screen.queryByLabelText(/Decrement Alice/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Alice'))
    expect(onCountChange).toHaveBeenCalledWith('alice', 1)
  })
})
