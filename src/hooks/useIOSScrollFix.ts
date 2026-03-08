// SPDX-License-Identifier: Apache-2.0
import { useRef, useEffect, type RefObject } from 'react'

/**
 * Prevents a scroll-lock bug on touch devices where a scroll container with
 * `overscroll-behavior: contain` becomes unresponsive after the user scrolls
 * to a boundary.
 *
 * Platform-specific handling:
 * - **iOS Safari**: nudge `scrollTop` 1px away from the exact top/bottom
 *   boundary on each `touchstart` so the browser never detects the "at
 *   boundary" state that triggers the lock.
 * - **Android Chrome**: override `overscroll-behavior` to `auto` at runtime.
 *   The boundary-nudge technique doesn't work on Android (different touch
 *   gesture evaluation model). Minor scroll chaining is acceptable since
 *   Android has no rubber-band effect.
 * - **Desktop**: no-op (mouse/trackpad never triggers the bug).
 *
 * @param externalRef - Optional existing ref to use instead of creating one
 */
export function useIOSScrollFix<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T>
) {
  const internalRef = useRef<T>(null)
  const ref = externalRef ?? internalRef

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isIOS) {
      // iOS Safari: nudge scrollTop 1px from boundaries on touchstart
      // to prevent overscroll-contain scroll-lock bug
      const handler = () => {
        const { scrollTop, scrollHeight, clientHeight } = el
        if (scrollTop <= 0) {
          el.scrollTop = 1
        } else if (scrollTop + clientHeight >= scrollHeight) {
          el.scrollTop = scrollHeight - clientHeight - 1
        }
      }
      el.addEventListener('touchstart', handler, { passive: true })
      return () => el.removeEventListener('touchstart', handler)
    } else if ('ontouchstart' in window) {
      // Android: overscroll-contain causes scroll-lock; disable it
      // Minor scroll chaining is acceptable (no rubber-band on Android)
      el.style.overscrollBehavior = 'auto'
      return () => { el.style.overscrollBehavior = '' }
    }
  }, [ref])

  return ref
}
