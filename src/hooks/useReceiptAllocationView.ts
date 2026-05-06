// SPDX-License-Identifier: Apache-2.0
import { useState, useCallback } from 'react'

export type AllocationView = 'by-item' | 'by-person'

const VIEW_KEY = 'spl1t:receipt-allocation-view'
const CARRY_KEY = 'spl1t:receipt-carry-forward'

function readView(): AllocationView {
  try {
    const stored = localStorage.getItem(VIEW_KEY)
    return stored === 'by-person' ? 'by-person' : 'by-item'
  } catch {
    return 'by-item'
  }
}

function readCarry(): boolean {
  try {
    return localStorage.getItem(CARRY_KEY) === 'true'
  } catch {
    return false
  }
}

export function useReceiptAllocationView(): [AllocationView, (next: AllocationView) => void] {
  const [view, setView] = useState<AllocationView>(readView)
  const update = useCallback((next: AllocationView) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // localStorage disabled — non-fatal
    }
  }, [])
  return [view, update]
}

export function useReceiptCarryForward(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(readCarry)
  const update = useCallback((next: boolean) => {
    setEnabled(next)
    try {
      localStorage.setItem(CARRY_KEY, next ? 'true' : 'false')
    } catch {
      // ignore
    }
  }, [])
  return [enabled, update]
}
