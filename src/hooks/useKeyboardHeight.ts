import { useState, useEffect } from 'react'

interface KeyboardState {
  isVisible: boolean
  keyboardHeight: number
  availableHeight: number
}

/**
 * Hook to detect mobile keyboard state using Visual Viewport API
 * Returns keyboard visibility, height, and available viewport height
 *
 * Browser Support:
 * - iOS Safari 13+
 * - Chrome 61+
 * - Edge 79+
 * Falls back gracefully on unsupported browsers
 */
export function useKeyboardHeight(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
    availableHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    // Check if Visual Viewport API is supported
    if (typeof window === 'undefined' || !window.visualViewport) {
      return // Graceful degradation
    }

    const visualViewport = window.visualViewport

    const handleResize = () => {
      const windowHeight = window.innerHeight
      const visualHeight = visualViewport.height
      const keyboardHeight = windowHeight - visualHeight

      // Keyboard is considered visible if viewport shrinks by more than 150px
      // This threshold helps avoid false positives from browser chrome changes
      const isVisible = keyboardHeight > 150

      setKeyboardState({
        isVisible,
        keyboardHeight: isVisible ? keyboardHeight : 0,
        availableHeight: visualHeight,
      })
    }

    // Set initial state
    handleResize()

    // Listen to viewport resize events
    visualViewport.addEventListener('resize', handleResize)
    visualViewport.addEventListener('scroll', handleResize)

    return () => {
      visualViewport.removeEventListener('resize', handleResize)
      visualViewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return keyboardState
}
