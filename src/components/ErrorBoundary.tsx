import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  resetCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    resetCount: 0,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    import('@/lib/logger').then(({ logger }) => {
      logger.error('React ErrorBoundary caught error', {
        errorMessage: error.message,
        errorName: error.name,
        componentStack: errorInfo.componentStack?.slice(0, 1000) ?? '',
      })
    }).catch(() => {})
  }

  private handleReset = () => {
    if (this.state.resetCount >= 2) return
    this.setState(prev => ({
      hasError: false,
      error: undefined,
      resetCount: prev.resetCount + 1,
    }))
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const exhaustedRetries = this.state.resetCount >= 2

      return (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {exhaustedRetries
                  ? 'This error keeps happening. Try going home or refreshing the page.'
                  : (this.state.error?.message || 'An unexpected error occurred. Please try again.')}
              </p>
              {exhaustedRetries ? (
                <div className="flex gap-3">
                  <Button onClick={this.handleGoHome} variant="default">
                    <Home size={16} className="mr-2" />
                    Go to home
                  </Button>
                  <Button onClick={this.handleRefresh} variant="outline">
                    <RefreshCw size={16} className="mr-2" />
                    Refresh page
                  </Button>
                </div>
              ) : (
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
              )}
              {exhaustedRetries && this.state.error && (
                <details className="mt-4 text-left w-full max-w-md">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
