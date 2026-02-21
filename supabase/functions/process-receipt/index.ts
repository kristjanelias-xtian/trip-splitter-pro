import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('process-receipt')
const metrics = createMetrics('process-receipt')

const SYSTEM_PROMPT = `You are a receipt parser. Extract all line items from the receipt image.
Return ONLY valid JSON with this exact structure:
{
  "merchant": "store name or null if unclear",
  "items": [{"name": "item name", "price": 12.50, "qty": 1}],
  "subtotal": 25.00,
  "total": 27.50,
  "currency": "USD"
}
Rules:
- price is the total price for that line (qty * unit price), as a number
- qty defaults to 1 if not shown
- currency is the 3-letter ISO code (default "USD" if unclear)
- If a value cannot be read, use null
- Do NOT include tax lines as items — include them in total but not subtotal
- Return ONLY the JSON object, no other text`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    logger.info('Request received', { method: req.method })

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!anthropicKey) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Supabase config missing')
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { receipt_task_id, image_base64, mime_type } = await req.json()

    if (!receipt_task_id || !image_base64) {
      return new Response(
        JSON.stringify({ error: "receipt_task_id and image_base64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Mark task as processing
    await supabase
      .from('receipt_tasks')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', receipt_task_id)

    logger.info('Calling Anthropic API', { task_id: receipt_task_id })
    const anthropicStart = performance.now()

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (mime_type ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image_base64,
            },
          },
          {
            type: 'text',
            text: 'Please extract all line items from this receipt.',
          },
        ],
      }],
    })

    const anthropicLatencyMs = Math.round(performance.now() - anthropicStart)
    logger.info('Anthropic API responded', { latencyMs: anthropicLatencyMs })
    metrics.push([
      { name: 'anthropic_api_latency_ms', value: anthropicLatencyMs, labels: { service_name: 'process-receipt' }, type: 'gauge' },
    ])

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse the JSON response
    let extracted: {
      merchant?: string | null
      items?: Array<{ name: string; price: number; qty: number }>
      subtotal?: number | null
      total?: number | null
      currency?: string | null
    } = {}

    try {
      // Strip markdown code blocks if present
      const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extracted = JSON.parse(jsonText)
    } catch {
      logger.warn('Failed to parse Anthropic JSON response', { raw: rawText.slice(0, 200) })
      await supabase
        .from('receipt_tasks')
        .update({
          status: 'failed',
          error_message: 'Could not parse receipt — please try a clearer photo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', receipt_task_id)

      metrics.push([{ name: 'receipt_extraction_total', value: 1, labels: { status: 'parse_error' }, type: 'counter' }])
      return new Response(
        JSON.stringify({ error: 'Could not parse receipt — please try a clearer photo' }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const items = (extracted.items ?? []).map(item => ({
      name: item.name ?? 'Unknown item',
      price: typeof item.price === 'number' ? item.price : 0,
      qty: typeof item.qty === 'number' ? item.qty : 1,
    }))

    const extractedTotal = typeof extracted.total === 'number' ? extracted.total : null
    const extractedCurrency = extracted.currency ?? 'USD'
    const extractedMerchant = extracted.merchant ?? null

    // Save results and mark as ready for review
    await supabase
      .from('receipt_tasks')
      .update({
        status: 'review',
        extracted_merchant: extractedMerchant,
        extracted_items: items,
        extracted_total: extractedTotal,
        extracted_currency: extractedCurrency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receipt_task_id)

    const totalMs = Math.round(performance.now() - requestStart)
    logger.info('Receipt processed successfully', { task_id: receipt_task_id, itemCount: items.length, totalMs })
    metrics.push([
      { name: 'receipt_extraction_total', value: 1, labels: { status: 'success' }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'process-receipt', status: 'success' }, type: 'gauge' },
    ])

    return new Response(
      JSON.stringify({
        ok: true,
        merchant: extractedMerchant,
        items,
        total: extractedTotal,
        currency: extractedCurrency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const totalMs = Math.round(performance.now() - requestStart)
    const errStr = String(err)
    console.error("Edge function error:", err)
    logger.error(`Unhandled exception: ${errStr}`, { error: errStr })
    metrics.push([
      { name: 'receipt_extraction_total', value: 1, labels: { status: 'error' }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'process-receipt', status: 'error' }, type: 'gauge' },
    ])
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
