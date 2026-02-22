import { useRef, useEffect } from 'react'

export function useAbortController() {
  const ref = useRef<AbortController | null>(null)

  // Cancel on unmount
  useEffect(() => () => { ref.current?.abort() }, [])

  /** Cancel any in-flight request and return a fresh AbortSignal for the new one. */
  function newSignal(): AbortSignal {
    ref.current?.abort()
    const controller = new AbortController()
    ref.current = controller
    return controller.signal
  }

  /** Explicitly cancel the current in-flight request (e.g. from useEffect cleanup). */
  const cancel = () => ref.current?.abort()

  return { newSignal, cancel }
}
