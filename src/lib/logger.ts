import { supabase } from '@/lib/supabase'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let persistentContext: Record<string, unknown> = {}

// ── Failed-log queue ────────────────────────────────────────────────────────
// When the Supabase edge function is unreachable (e.g. the same connectivity
// issue that caused the error we're trying to log), we buffer the entry in
// localStorage and retry it the next time a log send succeeds.

const QUEUE_KEY = 'spl1t:failed-logs'
const OLD_QUEUE_KEY = 'trip-splitter:failed-logs'
const MAX_QUEUED = 50

let logQueueMigrated = false
function migrateLogQueue(): void {
  if (logQueueMigrated) return
  logQueueMigrated = true
  try {
    const old = localStorage.getItem(OLD_QUEUE_KEY)
    if (old) {
      localStorage.setItem(QUEUE_KEY, old)
      localStorage.removeItem(OLD_QUEUE_KEY)
    }
  } catch {}
}

interface QueuedEntry {
  level: LogLevel
  message: string
  body: Record<string, unknown>
  ts: number
}

function enqueue(entry: QueuedEntry): void {
  migrateLogQueue()
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const q: QueuedEntry[] = raw ? JSON.parse(raw) : []
    q.push(entry)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUED)))
  } catch {}
}

function flushQueue(): void {
  migrateLogQueue()
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const q: QueuedEntry[] = JSON.parse(raw)
    if (q.length === 0) return
    localStorage.removeItem(QUEUE_KEY) // optimistic clear
    for (const entry of q) {
      supabase.functions
        .invoke('log-proxy', { body: { ...entry.body, message: `[queued] ${entry.body.message}`, context: { ...(entry.body.context as object), queued_at: new Date(entry.ts).toISOString() } } })
        .catch(() => enqueue(entry)) // re-queue if still failing
    }
  } catch {}
}
// ────────────────────────────────────────────────────────────────────────────

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  console[level](message, context)

  const body = {
    level,
    message,
    service: 'browser',
    context: {
      url: window.location.pathname,
      ...persistentContext,
      ...context,
    },
  }

  supabase.functions
    .invoke('log-proxy', { body })
    .then(() => flushQueue()) // on success, replay any buffered entries
    .catch(() => enqueue({ level, message, body, ts: Date.now() }))
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
