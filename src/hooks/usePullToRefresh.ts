import { useRef, useState, useEffect, useCallback } from 'react'
import { usePullToRefreshContext } from '@/contexts/PullToRefreshContext'

const THRESHOLD = 80
const MAX_PULL = 120
const RESISTANCE = 0.5

function isStandalone() {
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function usePullToRefresh() {
  const { onRefreshRef, isRefreshing, setIsRefreshing } = usePullToRefreshContext()
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentPullRef = useRef(0)
  const directionLockedRef = useRef<'vertical' | 'horizontal' | null>(null)
  const pullingRef = useRef(false)

  const isSheetOpen = useCallback(() => {
    return !!document.querySelector('[data-radix-dialog-overlay]')
  }, [])

  useEffect(() => {
    // Only activate in PWA standalone mode — regular browsers have their own refresh
    if (!isStandalone()) return

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      if (window.scrollY > 0) return
      if (isSheetOpen()) return

      startYRef.current = e.touches[0].clientY
      startXRef.current = e.touches[0].clientX
      directionLockedRef.current = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return
      if (isSheetOpen()) {
        // Sheet opened mid-gesture — abort
        if (pullingRef.current) {
          pullingRef.current = false
          setIsPulling(false)
          setPullDistance(0)
          currentPullRef.current = 0
        }
        return
      }

      const deltaY = e.touches[0].clientY - startYRef.current
      const deltaX = e.touches[0].clientX - startXRef.current

      // Lock direction on first significant movement
      if (!directionLockedRef.current) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          directionLockedRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
        }
      }

      // Ignore horizontal swipes
      if (directionLockedRef.current === 'horizontal') return

      // Only activate when pulling down from scroll top
      if (deltaY <= 0 || window.scrollY > 0) {
        if (pullingRef.current) {
          pullingRef.current = false
          setIsPulling(false)
          setPullDistance(0)
          currentPullRef.current = 0
        }
        return
      }

      // Prevent native scroll/bounce during pull
      e.preventDefault()

      const pull = Math.min(deltaY * RESISTANCE, MAX_PULL)
      currentPullRef.current = pull
      pullingRef.current = true
      setIsPulling(true)
      setPullDistance(pull)
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return

      const pull = currentPullRef.current
      pullingRef.current = false
      directionLockedRef.current = null

      if (pull >= THRESHOLD && onRefreshRef.current) {
        setIsRefreshing(true)
        setPullDistance(0)
        setIsPulling(false)
        try {
          await onRefreshRef.current()
        } finally {
          setIsRefreshing(false)
        }
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }

      currentPullRef.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isRefreshing, isSheetOpen, onRefreshRef, setIsRefreshing])

  return { pullDistance, isPulling, isRefreshing }
}
