/**
 * OTLP HTTP JSON metrics pusher for Supabase edge functions.
 * Uses /otlp/v1/metrics (no Snappy compression required, pure fetch).
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

export interface MetricPoint {
  name: string
  value: number
  labels?: Record<string, string>
  type?: 'counter' | 'gauge'
}

function buildOtlpBody(service: string, points: MetricPoint[]): string {
  const nowNs = String(BigInt(Date.now()) * 1_000_000n)

  const metrics = points.map((p) => {
    const attributes = Object.entries(p.labels ?? {}).map(([key, value]) => ({
      key,
      value: { stringValue: value },
    }))

    const dataPoint = {
      attributes,
      startTimeUnixNano: nowNs,
      timeUnixNano: nowNs,
      asDouble: p.value,
    }

    // Default to gauge; use sum (monotonic) for counters
    if (p.type === 'counter') {
      return {
        name: p.name,
        sum: {
          dataPoints: [dataPoint],
          aggregationTemporality: 2, // AGGREGATION_TEMPORALITY_CUMULATIVE
          isMonotonic: true,
        },
      }
    }

    return {
      name: p.name,
      gauge: { dataPoints: [dataPoint] },
    }
  })

  return JSON.stringify({
    resourceMetrics: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: service } },
            { key: 'deployment.environment', value: { stringValue: 'production' } },
          ],
        },
        scopeMetrics: [
          {
            scope: { name: 'trip-splitter-pro' },
            metrics,
          },
        ],
      },
    ],
  })
}

function pushToOtlp(service: string, points: MetricPoint[]): Promise<void> {
  const endpoint = Deno.env.get('OTLP_METRICS_ENDPOINT')
  const mimirUsername = Deno.env.get('MIMIR_USERNAME')
  const grafanaToken = Deno.env.get('GRAFANA_API_TOKEN')

  if (!endpoint || !mimirUsername || !grafanaToken) {
    return Promise.resolve()
  }

  const credentials = btoa(`${mimirUsername}:${grafanaToken}`)

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: buildOtlpBody(service, points),
  }).then(() => undefined)
}

export interface Metrics {
  push(points: MetricPoint[]): void
}

export function createMetrics(service: string): Metrics {
  return {
    push(points: MetricPoint[]) {
      const promise = pushToOtlp(service, points).catch(() => {})
      try {
        if (typeof EdgeRuntime !== 'undefined') {
          EdgeRuntime.waitUntil(promise)
        }
      } catch {
        // EdgeRuntime unavailable in local dev — fire-and-forget is fine
      }
    },
  }
}
