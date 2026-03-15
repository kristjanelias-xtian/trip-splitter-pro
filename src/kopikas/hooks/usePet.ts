// SPDX-License-Identifier: Apache-2.0
import { useContext } from 'react'
import { PetContext } from '../contexts/PetContext'

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) throw new Error('usePet must be used within PetProvider')
  return ctx
}
