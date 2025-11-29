import { useEffect, RefObject } from 'react'

interface UseScrollIntoViewOptions {
  enabled?: boolean
  offset?: number // Extra offset from top in pixels
  behavior?: ScrollBehavior
}

/**
 * Hook to automatically scroll focused inputs into view
 * Particularly useful when mobile keyboard appears and obscures input
 *
 * @param containerRef - Ref to the scrollable container
 * @param options - Configuration options
 */
export function useScrollIntoView(
  containerRef: RefObject<HTMLElement>,
  options: UseScrollIntoViewOptions = {}
) {
  const {
    enabled = true,
    offset = 20,
    behavior = 'smooth',
  } = options

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement

      // Only handle input elements
      if (
        !target.matches('input, textarea, select') ||
        target.getAttribute('type') === 'hidden'
      ) {
        return
      }

      // Wait for keyboard animation to settle (iOS needs this)
      setTimeout(() => {
        // Get element position relative to container
        const targetRect = target.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Calculate if element is obscured or close to bottom
        const elementTop = targetRect.top - containerRect.top
        const elementBottom = targetRect.bottom - containerRect.top
        const visibleHeight = containerRect.height

        // If element is in bottom half or obscured, scroll it into view
        if (elementBottom > visibleHeight - 100 || elementTop < offset) {
          // Scroll so the input is in the upper third of visible area
          const scrollTop = container.scrollTop + elementTop - offset - 60

          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior,
          })
        }
      }, 300) // iOS keyboard animation is ~300ms
    }

    // Use capture phase to catch focus events early
    container.addEventListener('focusin', handleFocus, true)

    return () => {
      container.removeEventListener('focusin', handleFocus, true)
    }
  }, [containerRef, enabled, offset, behavior])
}
