// SPDX-License-Identifier: Apache-2.0
import { useRef, useEffect, type RefObject } from 'react'

const isIOS =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/.test(navigator.userAgent)

/**
 * Prevents the iOS Safari scroll-lock bug where a scroll container
 * with `overscroll-behavior: contain` becomes unresponsive after
 * the user scrolls to a boundary.
 *
 * Fix: on each `touchstart`, nudge `scrollTop` 1px away from the
 * exact top/bottom boundary so iOS never detects the "at boundary"
 * state that triggers the lock.
 *
 * Only activates on iOS — no-op on other platforms.
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
    if (!el || !isIOS) return

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
  }, [ref])

  return ref
}
