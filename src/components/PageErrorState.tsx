// SPDX-License-Identifier: Apache-2.0
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PageErrorStateProps {
  error: string
  onRetry: () => void
  retrying?: boolean
}

export function PageErrorState({ error, onRetry, retrying = false }: PageErrorStateProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="gap-2"
        >
          {retrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}
