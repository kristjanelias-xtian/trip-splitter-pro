import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from 'npm:@anthropic-ai/sdk@0.80.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'
import { verifyAuth } from '../_shared/auth.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://split.xtian.me",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('process-receipt')
const metrics = createMetrics('process-receipt')

const SYSTEM_PROMPT = `You are a receipt parser. Extract all line items from the receipt image.
Return ONLY valid JSON with this exact structure:
{
  "merchant": "store name or null if truly not found",
  "date": "2026-02-22",
  "items": [{"name": "translated item name", "nameOriginal": "verbatim from receipt", "price": 12.50, "qty": 1}],
  "subtotal": 25.00,
  "total": 27.50,
  "currency": "USD",
  "category": "Food"
}
Rules:
- merchant: Scan the entire receipt, especially the header area at the top, for the business name, restaurant name, store name, or brand. It may appear as large text, a logo caption, a subtitle, or small print. If you see a name in both Latin and non-Latin script (e.g. Thai, Arabic, Chinese), return the Latin version. If the name is only in a non-Latin script, return a romanised/transliterated version of it. If truly no business name is readable anywhere, invent a short creative name (2-4 words) that evokes the vibe of the items ordered - e.g. "The Wandering Wok" for Thai food, "Mystery Grill" for a barbecue spot, "Island Bites" for tropical drinks. Never return null.
- date: The date printed on the receipt as an ISO date string (YYYY-MM-DD). If no date is visible, use null.
- items[].nameOriginal: the line item name EXACTLY as printed on the receipt. If the original is in a non-Latin script, romanise/transliterate it (do not translate it).
- items[].name: the line item translated/normalized into the target language given by the caller (see "Target language" below). If the original is already in the target language, name and nameOriginal are identical. Do not invent items - only translate names that actually appear on the receipt.
- price is the total price for that line (qty * unit price), as a number
- qty defaults to 1 if not shown
- currency is the 3-letter ISO code (default "USD" if unclear)
- If a value cannot be read, use null
- Do NOT include tax lines as items — include them in total but not subtotal
- DO include service charges, tips, and gratuities as separate line items (name them "Service Charge", "Tip", etc.)
- category: one of "Food", "Accommodation", "Transport", "Activities", "Training", or "Other". Infer from the merchant name and items. Examples: restaurants/cafes/groceries -> "Food", hotels/hostels/Airbnb -> "Accommodation", Grab/Uber/taxi/bus/train/flights -> "Transport", tours/parks/museums -> "Activities". Default to "Other" if unclear.
- Return ONLY the JSON object, no other text`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    // Verify JWT
    const auth = await verifyAuth(req, corsHeaders)
    if (auth.response) return auth.response
    const callerUserId = auth.user.id

    logger.info('Request received', { method: req.method, user_id: callerUserId })

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

    const { receipt_task_id, image_base64, mime_type, target_language } = await req.json()
    const targetLang = (typeof target_language === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(target_language)) ? target_language : 'en'

    if (!receipt_task_id || !image_base64) {
      return new Response(
        JSON.stringify({ error: "receipt_task_id and image_base64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Server-side image size limit (~7.5MB raw, ~10MB base64)
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024
    if (image_base64.length > MAX_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Image too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify caller owns the receipt task (FINDING-20)
    const { data: task, error: taskError } = await supabase
      .from('receipt_tasks')
      .select('id, created_by, status')
      .eq('id', receipt_task_id)
      .single()

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (task.created_by !== callerUserId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Idempotency check — only process tasks in 'pending' status (FINDING-42)
    if (task.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: true, status: task.status, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark task as processing (conditional update — safe against races)
    await supabase
      .from('receipt_tasks')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', receipt_task_id)
      .eq('status', 'pending')

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
            text: `Please extract all line items from this receipt. Pay special attention to the business or restaurant name at the top of the receipt — include it even if it is in a non-Latin script. Target language for translated item names: ${targetLang}.`,
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
      date?: string | null
      items?: Array<{ name: string; nameOriginal?: string; price: number; qty: number }>
      subtotal?: number | null
      total?: number | null
      currency?: string | null
      category?: string | null
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

    const items = (extracted.items ?? []).slice(0, 100).map((item: { name?: string; nameOriginal?: string; price?: number; qty?: number }) => {
      const name = (item.name ?? 'Unknown item').slice(0, 200)
      const nameOriginal = typeof item.nameOriginal === 'string' && item.nameOriginal.length > 0
        ? item.nameOriginal.slice(0, 200)
        : name
      return {
        id: crypto.randomUUID(),
        name,
        nameOriginal,
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.qty === 'number' ? item.qty : 1,
      }
    })

    const extractedTotal = typeof extracted.total === 'number' ? extracted.total : null
    const extractedCurrency = extracted.currency ?? 'USD'
    const extractedMerchant = (extracted.merchant ?? 'Mystery Kitchen').slice(0, 200)
    // Validate ISO date format (YYYY-MM-DD) — ignore malformed values
    const extractedDate = typeof extracted.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date)
      ? extracted.date
      : null
    const validCategories = ['Food', 'Accommodation', 'Transport', 'Activities', 'Training', 'Other']
    const extractedCategory = validCategories.includes(extracted.category ?? '') ? extracted.category! : null

    // Save results and mark as ready for review
    await supabase
      .from('receipt_tasks')
      .update({
        status: 'review',
        extracted_merchant: extractedMerchant,
        extracted_items: items,
        extracted_total: extractedTotal,
        extracted_currency: extractedCurrency,
        extracted_date: extractedDate,
        extracted_category: extractedCategory,
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
        date: extractedDate,
        category: extractedCategory,
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
