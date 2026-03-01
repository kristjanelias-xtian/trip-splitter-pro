import { ArrowDown, Loader2 } from 'lucide-react'

const THRESHOLD = 80

interface Props {
  pullDistance: number
  isPulling: boolean
  isRefreshing: boolean
}

export function PullToRefreshIndicator({ pullDistance, isPulling, isRefreshing }: Props) {
  if (!isPulling && !isRefreshing && pullDistance === 0) return null

  const height = isRefreshing ? 48 : pullDistance
  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const rotation = progress * 180

  return (
    <div
      className="flex items-end justify-center overflow-hidden"
      style={{
        height,
        transition: isPulling ? 'none' : 'height 200ms ease-out',
      }}
    >
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
        {isRefreshing ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <ArrowDown
            className="w-4 h-4 text-muted-foreground transition-transform"
            style={{ transform: `rotate(${rotation}deg)`, transition: isPulling ? 'none' : 'transform 200ms ease-out' }}
          />
        )}
      </div>
    </div>
  )
}
