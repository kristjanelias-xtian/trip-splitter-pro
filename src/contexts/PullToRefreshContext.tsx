import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'

interface PullToRefreshContextValue {
  onRefreshRef: React.MutableRefObject<(() => Promise<void>) | null>
  isRefreshing: boolean
  setIsRefreshing: (v: boolean) => void
  registerRefresh: (fn: () => Promise<void>) => void
  unregisterRefresh: (fn: () => Promise<void>) => void
}

const PullToRefreshContext = createContext<PullToRefreshContextValue | null>(null)

export function PullToRefreshProvider({ children }: { children: ReactNode }) {
  const onRefreshRef = useRef<(() => Promise<void>) | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const registerRefresh = useCallback((fn: () => Promise<void>) => {
    onRefreshRef.current = fn
  }, [])

  const unregisterRefresh = useCallback((fn: () => Promise<void>) => {
    if (onRefreshRef.current === fn) {
      onRefreshRef.current = null
    }
  }, [])

  return (
    <PullToRefreshContext.Provider value={{ onRefreshRef, isRefreshing, setIsRefreshing, registerRefresh, unregisterRefresh }}>
      {children}
    </PullToRefreshContext.Provider>
  )
}

export function usePullToRefreshContext() {
  const ctx = useContext(PullToRefreshContext)
  if (!ctx) throw new Error('usePullToRefreshContext must be used within PullToRefreshProvider')
  return ctx
}
