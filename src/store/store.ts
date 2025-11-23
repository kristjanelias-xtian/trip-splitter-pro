import { create } from 'zustand'

interface AppState {
  currentTripId: string | null
  setCurrentTripId: (tripId: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  currentTripId: null,
  setCurrentTripId: (tripId) => set({ currentTripId: tripId }),
}))
