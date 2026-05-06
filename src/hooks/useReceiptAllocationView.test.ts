// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReceiptAllocationView, useReceiptCarryForward } from './useReceiptAllocationView'

describe('useReceiptAllocationView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to by-item when nothing is stored', () => {
    const { result } = renderHook(() => useReceiptAllocationView())
    expect(result.current[0]).toBe('by-item')
  })

  it('reads stored value', () => {
    localStorage.setItem('spl1t:receipt-allocation-view', 'by-person')
    const { result } = renderHook(() => useReceiptAllocationView())
    expect(result.current[0]).toBe('by-person')
  })

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useReceiptAllocationView())
    act(() => result.current[1]('by-person'))
    expect(result.current[0]).toBe('by-person')
    expect(localStorage.getItem('spl1t:receipt-allocation-view')).toBe('by-person')
  })

  it('falls back to default for invalid stored values', () => {
    localStorage.setItem('spl1t:receipt-allocation-view', 'garbage')
    const { result } = renderHook(() => useReceiptAllocationView())
    expect(result.current[0]).toBe('by-item')
  })
})

describe('useReceiptCarryForward', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to false when nothing is stored', () => {
    const { result } = renderHook(() => useReceiptCarryForward())
    expect(result.current[0]).toBe(false)
  })

  it('reads stored true', () => {
    localStorage.setItem('spl1t:receipt-carry-forward', 'true')
    const { result } = renderHook(() => useReceiptCarryForward())
    expect(result.current[0]).toBe(true)
  })

  it('persists true', () => {
    const { result } = renderHook(() => useReceiptCarryForward())
    act(() => result.current[1](true))
    expect(localStorage.getItem('spl1t:receipt-carry-forward')).toBe('true')
  })

  it('persists false (resets stored value)', () => {
    localStorage.setItem('spl1t:receipt-carry-forward', 'true')
    const { result } = renderHook(() => useReceiptCarryForward())
    act(() => result.current[1](false))
    expect(localStorage.getItem('spl1t:receipt-carry-forward')).toBe('false')
  })
})
