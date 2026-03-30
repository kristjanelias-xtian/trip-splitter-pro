import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from 'npm:@anthropic-ai/sdk@0.80.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('process-kopikas-receipt')
const metrics = createMetrics('process-kopikas-receipt')

const KOPIKAS_CATEGORIES = ['sweets', 'snack', 'food', 'clothes', 'beauty', 'fun', 'school', 'gifts', 'charity', 'other']

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!anthropicKey) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { wallet_code, image } = await req.json()

    if (!wallet_code || !image) {
      return new Response(
        JSON.stringify({ error: "wallet_code and image are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate wallet exists
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('wallet_code', wallet_code)
      .single()

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: "Wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Extract media type from data URL (e.g. "data:image/jpeg;base64,..." → "image/jpeg")
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/)
    const mediaType = mimeMatch?.[1] ?? 'image/jpeg'

    logger.info('Processing receipt', { wallet_id: wallet.id, media_type: mediaType, image_size: image.length })

    // Fetch correction history for this wallet (few-shot examples for AI)
    const { data: corrections } = await supabase
      .from('wallet_category_corrections')
      .select('item_description, original_category, corrected_category')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build corrections context
    let correctionsContext = ''
    if (corrections && corrections.length > 0) {
      correctionsContext = '\n\nPrevious category corrections for this user (use these to improve accuracy):\n'
      for (const c of corrections) {
        correctionsContext += `- "${c.item_description}": was "${c.original_category}", should be "${c.corrected_category}"\n`
      }
    }

    const systemPrompt = `You are a receipt parser for a kid's pocket money tracker called Kopikas.
Extract all line items from the receipt image.
Return ONLY valid JSON with this structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [{"name": "item name", "price": 12.50, "qty": 1, "category": "food"}]
}

Categories (pick one PER ITEM based on what the item is):
${KOPIKAS_CATEGORIES.join(', ')}

Category guidance:
- sweets: candy, chocolate, ice cream, cookies, gummy bears, lollipops
- snack: chips, crackers, nuts, popcorn, granola bars, pretzels
- food: meals, pizza, drinks, groceries, coffee, juice, bread, milk
- clothes: shirts, pants, shoes, hats, socks, dresses
- beauty: lipstick, cream, perfume, nail polish, shampoo
- fun: games, movies, tickets, toys, Roblox, Netflix
- school: notebooks, pencils, pens, backpacks, books, textbooks
- gifts: presents, birthday cards, gift wrapping
- charity: donations
- other: anything that doesn't fit above
${correctionsContext}

Rules:
- Each item gets its OWN category based on what the item is
- price is the total for that line (qty × unit price), as a number
- qty defaults to 1 if not shown
- merchant: the store/business name from the receipt header
- date: the date on the receipt in YYYY-MM-DD format, or null
- Do NOT include tax lines as items
- DO include service charges as items
- Return ONLY the JSON, no other text`

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: image.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: 'Parse this receipt and extract all items with categories.',
            },
          ],
        },
      ],
      system: systemPrompt,
    })

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON from response (handle possible markdown wrapping)
    let jsonStr = (textBlock as { type: 'text'; text: string }).text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonStr)

    // Upload receipt image to storage
    let receiptImagePath: string | null = null
    try {
      const imageData = image.replace(/^data:image\/\w+;base64,/, '')
      const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
      const receiptId = crypto.randomUUID()
      const ext = mediaType === 'image/png' ? 'png' : 'jpg'
      const storagePath = `${wallet.id}/${receiptId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('kopikas-receipts')
        .upload(storagePath, imageBytes, { contentType: mediaType })

      if (uploadError) {
        logger.error('Failed to upload receipt image', { error: uploadError.message })
      } else {
        receiptImagePath = storagePath
      }
    } catch (uploadErr) {
      logger.error('Receipt image upload error', { error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr) })
    }

    // Add receipt path to response
    parsed.receipt_image_path = receiptImagePath

    const duration = performance.now() - requestStart
    logger.info('Receipt processed', {
      wallet_id: wallet.id,
      items: parsed.items?.length ?? 0,
      receipt_image_path: receiptImagePath,
      duration_ms: Math.round(duration),
    })
    metrics.push([{ name: 'receipts_processed', value: 1, labels: { service_name: 'process-kopikas-receipt' }, type: 'counter' }])

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    const duration = performance.now() - requestStart
    logger.error('Receipt processing failed', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Math.round(duration),
    })
    metrics.push([{ name: 'receipt_errors', value: 1, labels: { service_name: 'process-kopikas-receipt' }, type: 'counter' }])

    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
