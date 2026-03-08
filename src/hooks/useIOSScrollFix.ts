// SPDX-License-Identifier: Apache-2.0
import { useRef, useEffect, type RefObject } from 'react'

/**
 * Applies `overscroll-behavior: contain` and platform-specific scroll fixes
 * to prevent scroll chaining in bottom sheets and dialogs.
 *
 * Instead of applying `overscroll-contain` in CSS (which breaks Android Chrome),
 * this hook applies it programmatically only where safe:
 *
 * - **iOS Safari**: sets `contain` + nudges `scrollTop` 1px from boundaries
 *   on each `touchstart` to prevent the scroll-lock bug.
 * - **Desktop** (no touch): sets `contain` to prevent scroll chaining through
 *   dialogs/sheets.
 * - **Android**: no-op — never sees `contain`, avoiding the scroll-lock bug
 *   entirely. Minor scroll chaining is acceptable (no rubber-band on Android).
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
      // iOS Safari: apply contain + nudge scrollTop 1px from boundaries
      // on touchstart to prevent overscroll-contain scroll-lock bug
      el.style.overscrollBehavior = 'contain'
      const handler = () => {
        const { scrollTop, scrollHeight, clientHeight } = el
        if (scrollTop <= 0) {
          el.scrollTop = 1
        } else if (scrollTop + clientHeight >= scrollHeight) {
          el.scrollTop = scrollHeight - clientHeight - 1
        }
      }
      el.addEventListener('touchstart', handler, { passive: true })
      return () => {
        el.style.overscrollBehavior = ''
        el.removeEventListener('touchstart', handler)
      }
    } else if (!('ontouchstart' in window)) {
      // Desktop: prevent scroll chaining through dialogs
      el.style.overscrollBehavior = 'contain'
      return () => { el.style.overscrollBehavior = '' }
    }
    // Android: no-op — leave default 'auto', no scroll-lock
  }, [ref])

  return ref
}
