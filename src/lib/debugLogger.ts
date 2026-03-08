// SPDX-License-Identifier: Apache-2.0
/**
 * Debug logger for production diagnostics.
 *
 * Writes to localStorage as a circular buffer. Survives page refreshes.
 * Only active when `localStorage.getItem('spl1t_debug') === 'true'`.
 *
 * Writes are debounced (max once per 500ms) to avoid excessive
 * localStorage serialization on busy sessions. A synchronous flush
 * runs on beforeunload to prevent data loss.
 *
 * Usage in browser console:
 *   localStorage.setItem('spl1t_debug', 'true')  // enable, then refresh
 *   window.__spl1tLogs()     // dump all logs as formatted JSON
 *   window.__spl1tLastN(10)  // last 10 entries
 *   window.__spl1tClear()    // clear all logs
 */

const STORAGE_KEY = 'spl1t:debug-logs'
const MAX_ENTRIES = 500
const SESSION_KEY = 'spl1t:debug-session-id'
const FLUSH_INTERVAL_MS = 500

type LogEntry = {
  ts: string
  sessionId: string
  type: string
  payload: Record<string, unknown>
}

let pendingLogs: LogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function isEnabled(): boolean {
  try {
    return localStorage.getItem('spl1t_debug') === 'true'
  } catch {
    return false
  }
}

function readStoredLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    // Storage full — drop oldest half
    try {
      const trimmed = logs.slice(Math.floor(logs.length / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up
    }
  }
}

function flushNow() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pendingLogs.length === 0) return
  const stored = readStoredLogs()
  const merged = [...stored, ...pendingLogs].slice(-MAX_ENTRIES)
  pendingLogs = []
  writeLogs(merged)
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushNow()
  }, FLUSH_INTERVAL_MS)
}

function appendLog(type: string, payload: Record<string, unknown>) {
  if (!isEnabled()) return
  pendingLogs.push({
    ts: new Date().toISOString(),
    sessionId: getSessionId(),
    type,
    payload,
  })
  scheduleFlush()
}

// Synchronous flush on page unload to prevent data loss
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushNow)
}

// --- Public API ---

export const debugLog = {
  auth(event: string, detail?: Record<string, unknown>) {
    appendLog('auth', { event, ...detail })
  },
  query(action: string, detail?: Record<string, unknown>) {
    appendLog('query', { action, ...detail })
  },
  subscription(action: string, detail?: Record<string, unknown>) {
    appendLog('subscription', { action, ...detail })
  },
  context(name: string, action: string, detail?: Record<string, unknown>) {
    appendLog('context', { name, action, ...detail })
  },
  error(source: string, detail?: Record<string, unknown>) {
    appendLog('error', { source, ...detail })
  },
}

// --- Browser console helpers ---

if (typeof window !== 'undefined') {
  (window as any).__spl1tLogs = () => {
    flushNow()
    const logs = readStoredLogs()
    console.log(JSON.stringify(logs, null, 2))
    return logs
  };
  (window as any).__spl1tLastN = (n: number) => {
    flushNow()
    const logs = readStoredLogs()
    const last = logs.slice(-n)
    console.log(JSON.stringify(last, null, 2))
    return last
  };
  (window as any).__spl1tClear = () => {
    pendingLogs = []
    if (flushTimer !== null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    localStorage.removeItem(STORAGE_KEY)
    console.log('Debug logs cleared')
  }
}
