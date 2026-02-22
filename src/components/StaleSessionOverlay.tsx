import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaleSessionOverlayProps {
  onRefresh: () => void
}

export function StaleSessionOverlay({ onRefresh }: StaleSessionOverlayProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-lg">
        <RefreshCw size={40} className="mx-auto mb-3 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Session expired</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Your login session has expired. Refresh the page to continue.
        </p>
        <Button onClick={onRefresh} className="w-full">
          Refresh Page
        </Button>
      </div>
    </div>
  )
}
