import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createLogger } from '../_shared/logger.ts'

const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error'])
const MAX_MESSAGE_LEN = 2000
const MAX_SERVICE_LEN = 64
const MAX_CONTEXT_KEYS = 20
const MAX_CONTEXT_VALUE_LEN = 500

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { level, message, service: rawService, context: rawContext } = body

    if (!VALID_LEVELS.has(level)) {
      return new Response(
        JSON.stringify({ ok: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (typeof message !== 'string') {
      return new Response(
        JSON.stringify({ ok: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const safeMessage = message.slice(0, MAX_MESSAGE_LEN)
    const safeService = typeof rawService === 'string'
      ? rawService.slice(0, MAX_SERVICE_LEN)
      : 'browser'

    let safeContext: Record<string, unknown> | undefined
    if (rawContext && typeof rawContext === 'object' && !Array.isArray(rawContext)) {
      safeContext = {}
      const entries = Object.entries(rawContext).slice(0, MAX_CONTEXT_KEYS)
      for (const [k, v] of entries) {
        safeContext[k] = typeof v === 'string' ? v.slice(0, MAX_CONTEXT_VALUE_LEN) : v
      }
    }

    const logger = createLogger(safeService)
    logger[level as 'debug' | 'info' | 'warn' | 'error'](safeMessage, safeContext)

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
