// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface PageLoadingStateProps {
  slowMessage?: string
  slowTimeout?: number
}

export function PageLoadingState({
  slowMessage = 'Taking longer than expected...',
  slowTimeout = 8000,
}: PageLoadingStateProps) {
  const [showSlowMessage, setShowSlowMessage] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowMessage(true), slowTimeout)
    return () => clearTimeout(timer)
  }, [slowTimeout])

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      {showSlowMessage && (
        <p className="text-sm text-muted-foreground">{slowMessage}</p>
      )}
    </div>
  )
}
