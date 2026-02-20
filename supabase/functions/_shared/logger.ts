/**
 * Server-side Loki logger for Supabase edge functions.
 * Credentials are read from Supabase secrets (never exposed to the browser).
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function pushToLoki(
  service: string,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const lokiUrl = Deno.env.get('LOKI_PUSH_URL')
  const lokiUsername = Deno.env.get('LOKI_USERNAME')
  const grafanaToken = Deno.env.get('GRAFANA_API_TOKEN')

  if (!lokiUrl || !lokiUsername || !grafanaToken) {
    console.warn('[loki] skipping push — missing env vars', {
      hasUrl: !!lokiUrl, hasUsername: !!lokiUsername, hasToken: !!grafanaToken,
    })
    return Promise.resolve()
  }

  const timestampNs = String(Date.now() * 1_000_000)
  const line = JSON.stringify({ level, message, service, env: 'production', ...context })

  const body = JSON.stringify({
    streams: [
      {
        stream: { service, level, env: 'production' },
        values: [[timestampNs, line]],
      },
    ],
  })

  const credentials = btoa(`${lokiUsername}:${grafanaToken}`)

  return fetch(lokiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[loki] push failed: ${res.status} ${res.statusText} — ${text}`)
    } else {
      console.log(`[loki] push ok: ${res.status}`)
    }
  })
}

function fireAndForget(service: string, level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const promise = pushToLoki(service, level, message, context).catch((err) => {
    console.error(`[loki] push threw: ${err?.message ?? err}`)
  })
  try {
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(promise)
    }
  } catch {
    // EdgeRuntime unavailable in local dev — fire-and-forget is fine
  }
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

export function createLogger(service: string): Logger {
  const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level, service, message, ...context }))
    fireAndForget(service, level, message, context)
  }

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
  }
}
