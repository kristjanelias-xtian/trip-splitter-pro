import { supabase } from '@/lib/supabase'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let persistentContext: Record<string, unknown> = {}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  console[level](message, context)

  supabase.functions
    .invoke('log-proxy', {
      body: {
        level,
        message,
        service: 'browser',
        context: {
          url: window.location.pathname,
          ...persistentContext,
          ...context,
        },
      },
    })
    .catch(() => {})
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context)
  },
  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context)
  },
  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context)
  },
  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context)
  },
  setContext(ctx: Record<string, unknown>): void {
    persistentContext = { ...persistentContext, ...ctx }
  },
  clearContext(): void {
    persistentContext = {}
  },
}
