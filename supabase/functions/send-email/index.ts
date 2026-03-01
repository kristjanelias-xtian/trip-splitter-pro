import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'
import { verifyAuth } from '../_shared/auth.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://split.xtian.me",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('send-email')
const metrics = createMetrics('send-email')

const APP_URL = 'https://split.xtian.me'
const FROM_ADDRESS = 'Spl1t <noreply@xtian.me>'

const BRAND = {
  coral:       '#e8613a',
  coralDark:   '#c94e28',
  coralLight:  '#fdf1ed',
  textPrimary: '#111827',
  textMuted:   '#6b7280',
  border:      '#e5e7eb',
  background:  '#f9fafb',
  white:       '#ffffff',
} as const

/**
 * Escape user-supplied strings before interpolation into HTML email templates.
 * Prevents HTML injection / stored XSS via malicious trip names, participant names, etc.
 */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function baseEmailHtml(params: {
  title: string
  subtitle: string
  bodyContent: string
  footerOrganiser: string  // pre-escaped
  tripUrl: string
}): string {
  const { title, subtitle, bodyContent, footerOrganiser, tripUrl } = params
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.background};font-family:system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.background};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;">
          <!-- Header — coral brand -->
          <tr>
            <td style="background:${BRAND.coral};padding:28px 32px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:${BRAND.white};letter-spacing:-0.5px;">Spl<span style="color:${BRAND.coralLight};">1</span>t</div>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${subtitle}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid ${BRAND.border};text-align:center;">
              <p style="margin:0;color:${BRAND.textMuted};font-size:12px;">
                Sent by <strong>${footerOrganiser}</strong> via Spl<span style="color:${BRAND.coral};">1</span>t &middot; <a href="${tripUrl}" style="color:${BRAND.coral};text-decoration:none;">Open trip &rarr;</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

type ReceiptEmailData = {
  merchant: string | null
  items: Array<{ name: string; price: number; qty: number }> | null
  confirmed_total: number | null
  tip_amount: number
  currency: string | null
  mapped_items?: Array<{ item_index: number; participant_ids: string[] }> | null
  debtor_participant_ids?: string[]
}

type SendEmailBody =
  | {
      type: 'invitation'
      invitation_id: string
      trip_name: string
      trip_code: string
      participant_name: string
      participant_email: string
      organiser_name: string
      token: string
    }
  | {
      type: 'payment_reminder'
      trip_id: string
      trip_name: string
      trip_code: string
      recipient_name: string
      recipient_email: string
      amount: number
      currency: string
      pay_to_name: string
      organiser_name: string
      receipts?: ReceiptEmailData[]
    }

function invitationEmailHtml(params: {
  participantName: string
  organiserName: string
  tripName: string
  joinUrl: string
  tripUrl: string
}): string {
  const { participantName, organiserName, tripName, joinUrl, tripUrl } = params
  const bodyContent = `
              <h2 style="margin:0 0 16px;color:${BRAND.textPrimary};font-size:20px;font-weight:700;">Hey ${escapeHtml(participantName)}!</h2>
              <p style="margin:0 0 28px;color:${BRAND.textMuted};font-size:15px;line-height:1.6;">
                <strong style="color:${BRAND.textPrimary};">${escapeHtml(organiserName)}</strong> added you to <strong style="color:${BRAND.textPrimary};">${escapeHtml(tripName)}</strong>.
                Tap below to see your share of the costs &mdash; no account needed.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <a href="${joinUrl}" style="display:inline-block;background:${BRAND.coral};color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View my balance &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:${BRAND.textMuted};font-size:13px;text-align:center;">
                Want to track expenses in one place? <a href="${tripUrl}" style="color:${BRAND.coral};text-decoration:none;">Sign in with Google</a> to link your account.
              </p>`
  return baseEmailHtml({
    title: `${escapeHtml(organiserName)} added you to ${escapeHtml(tripName)}`,
    subtitle: 'Trip Invitation',
    bodyContent,
    footerOrganiser: escapeHtml(organiserName),
    tripUrl,
  })
}

function formatPrice(amount: number, currency: string | null): string {
  if (!currency) return amount.toFixed(2)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${escapeHtml(currency)} ${amount.toFixed(2)}`
  }
}

function receiptTableHtml(receipt: ReceiptEmailData): string {
  const currency = receipt.currency
  const items = receipt.items ?? []
  const merchant = escapeHtml(receipt.merchant || 'Receipt')
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tip = receipt.tip_amount ?? 0
  const total = receipt.confirmed_total ?? (subtotal + tip)

  const rowStyle = `border-bottom:1px solid ${BRAND.border};`
  const cellStyle = `padding:6px 8px;color:${BRAND.textMuted};font-size:13px;`

  const isDebtorItem = (index: number): boolean => {
    if (!receipt.mapped_items || !receipt.debtor_participant_ids?.length) return false
    const mapping = receipt.mapped_items.find(m => m.item_index === index)
    if (!mapping) return false
    return mapping.participant_ids.some(id => receipt.debtor_participant_ids!.includes(id))
  }

  const itemRows = items.map((item, index) => {
    const highlight = isDebtorItem(index)
    const rowBg = highlight ? `background:${BRAND.coralLight};border-left:3px solid ${BRAND.coral};` : ''
    return `
    <tr style="${rowStyle}${rowBg}">
      <td style="${cellStyle}">${escapeHtml(item.name)}</td>
      <td style="${cellStyle}text-align:center;">${item.qty}</td>
      <td style="${cellStyle}text-align:right;">${formatPrice(item.price * item.qty, currency)}</td>
    </tr>`
  }).join('')

  const tipRow = tip > 0 ? `
    <tr style="${rowStyle}">
      <td colspan="2" style="${cellStyle}font-style:italic;">Tip</td>
      <td style="${cellStyle}text-align:right;">${formatPrice(tip, currency)}</td>
    </tr>` : ''

  return `
  <div style="margin-bottom:16px;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
    <div style="background:${BRAND.background};padding:8px 12px;border-bottom:1px solid ${BRAND.border};">
      <strong style="color:${BRAND.textPrimary};font-size:13px;">${merchant}</strong>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:${BRAND.background};border-bottom:1px solid ${BRAND.border};">
          <th style="padding:6px 8px;color:${BRAND.textMuted};font-size:12px;font-weight:600;text-align:left;">Item</th>
          <th style="padding:6px 8px;color:${BRAND.textMuted};font-size:12px;font-weight:600;text-align:center;">Qty</th>
          <th style="padding:6px 8px;color:${BRAND.textMuted};font-size:12px;font-weight:600;text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${tipRow}
        <tr>
          <td colspan="2" style="padding:8px;color:${BRAND.textPrimary};font-size:13px;font-weight:700;">Total</td>
          <td style="padding:8px;color:${BRAND.textPrimary};font-size:13px;font-weight:700;text-align:right;">${formatPrice(total, currency)}</td>
        </tr>
      </tbody>
    </table>
  </div>`
}

function paymentReminderEmailHtml(params: {
  recipientName: string
  organiserName: string
  tripName: string
  formattedAmount: string
  payToName: string
  tripUrl: string
  settlementsUrl: string
  receipts?: ReceiptEmailData[]
}): string {
  const { recipientName, organiserName, tripName, formattedAmount, payToName, tripUrl, settlementsUrl, receipts } = params
  const hasReceipts = receipts && receipts.length > 0
  const receiptSection = hasReceipts ? `
              <!-- Receipt tables -->
              <div style="margin-bottom:24px;">
                <p style="margin:0 0 12px;color:${BRAND.textMuted};font-size:14px;font-weight:600;">What you're splitting:</p>
                ${receipts.map(r => receiptTableHtml(r)).join('')}
                <p style="margin:8px 0 0;color:${BRAND.textMuted};font-size:12px;text-align:center;font-style:italic;">
                  Full receipt photo available in the Spl1t app.
                </p>
              </div>` : ''

  const bodyContent = `
              <h2 style="margin:0 0 8px;color:${BRAND.textPrimary};font-size:20px;font-weight:600;">Hi ${escapeHtml(recipientName)}!</h2>
              <p style="margin:0 0 24px;color:${BRAND.textMuted};font-size:15px;line-height:1.6;">
                This is a friendly reminder from <strong style="color:${BRAND.textPrimary};">${escapeHtml(organiserName)}</strong> about an outstanding balance from <strong style="color:${BRAND.textPrimary};">${escapeHtml(tripName)}</strong>.
              </p>
              <!-- Amount Box — coral tint -->
              <div style="background:${BRAND.coralLight};border:2px solid ${BRAND.coral};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;color:${BRAND.coral};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You owe</p>
                <p style="margin:0 0 4px;color:${BRAND.textPrimary};font-size:36px;font-weight:700;">${escapeHtml(formattedAmount)}</p>
                <p style="margin:0;color:${BRAND.textMuted};font-size:14px;">to <strong style="color:${BRAND.textPrimary};">${escapeHtml(payToName)}</strong></p>
              </div>
              ${receiptSection}
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <a href="${settlementsUrl}" style="display:inline-block;background:${BRAND.coral};color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View balance &amp; settle up &rarr;
                    </a>
                  </td>
                </tr>
              </table>`
  return baseEmailHtml({
    title: `Payment reminder for ${escapeHtml(tripName)}`,
    subtitle: 'Payment Reminder',
    bodyContent,
    footerOrganiser: escapeHtml(organiserName),
    tripUrl,
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    // Verify JWT
    const auth = await verifyAuth(req, corsHeaders)
    if (auth.response) return auth.response

    logger.info('Request received', { method: req.method, user_id: auth.user.id })

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
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

    const body = await req.json() as SendEmailBody
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let subject: string
    let html: string
    let toEmail: string
    let toName: string
    let emailType: string
    let tripId: string | null = null
    let invitationId: string | null = null

    if (body.type === 'invitation') {
      const joinUrl = `${APP_URL}/join/${body.token}`
      const tripUrl = `${APP_URL}/t/${body.trip_code}/quick`
      subject = `${body.organiser_name} added you to "${body.trip_name}"`
      html = invitationEmailHtml({
        participantName: body.participant_name,
        organiserName: body.organiser_name,
        tripName: body.trip_name,
        joinUrl,
        tripUrl,
      })
      toEmail = body.participant_email
      toName = body.participant_name
      emailType = 'invitation'
      invitationId = body.invitation_id

      // Look up trip_id from the invitation
      const { data: inv } = await supabase
        .from('invitations')
        .select('trip_id')
        .eq('id', body.invitation_id)
        .single()
      tripId = inv?.trip_id ?? null
    } else if (body.type === 'payment_reminder') {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: body.currency,
      }).format(body.amount)
      const tripUrl = `${APP_URL}/t/${body.trip_code}/quick`
      const settlementsUrl = `${APP_URL}/t/${body.trip_code}/settlements`

      subject = `Payment reminder for "${body.trip_name}"`
      html = paymentReminderEmailHtml({
        recipientName: body.recipient_name,
        organiserName: body.organiser_name,
        tripName: body.trip_name,
        formattedAmount,
        payToName: body.pay_to_name,
        tripUrl,
        settlementsUrl,
        receipts: body.receipts,
      })
      toEmail = body.recipient_email
      toName = body.recipient_name
      emailType = 'payment_reminder'
      tripId = body.trip_id
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    logger.info('Sending email via Resend', { type: emailType, to: toEmail })
    const resendStart = performance.now()

    const resendPayload = {
      from: FROM_ADDRESS,
      to: [toEmail],
      subject,
      html,
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const resendLatencyMs = Math.round(performance.now() - resendStart)
    logger.info('Resend responded', { status: resendResponse.status, latencyMs: resendLatencyMs })
    metrics.push([{ name: 'resend_api_latency_ms', value: resendLatencyMs, labels: { service_name: 'send-email' }, type: 'gauge' }])

    const resendData = await resendResponse.json() as { id?: string; error?: { message: string } }
    const emailStatus = resendResponse.ok ? 'sent' : 'failed'

    // Write to email_log (fire-and-forget, don't block on failure)
    supabase.from('email_log').insert([{
      trip_id: tripId,
      invitation_id: invitationId,
      email_type: emailType,
      recipient_email: toEmail,
      recipient_name: toName,
      status: emailStatus,
      resend_message_id: resendData.id ?? null,
      metadata: resendResponse.ok ? null : { resend_error: resendData.error?.message },
    }]).then(({ error }) => {
      if (error) logger.warn('Failed to write email_log', { error: String(error) })
    })

    if (!resendResponse.ok) {
      logger.error('Resend API error', { status: resendResponse.status, error: resendData.error?.message })
      metrics.push([{ name: 'email_send_total', value: 1, labels: { status: 'error', type: emailType }, type: 'counter' }])
      return new Response(
        JSON.stringify({ error: resendData.error?.message ?? 'Failed to send email' }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const totalMs = Math.round(performance.now() - requestStart)
    logger.info('Email sent', { type: emailType, messageId: resendData.id, totalMs })
    metrics.push([
      { name: 'email_send_total', value: 1, labels: { status: 'success', type: emailType }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'send-email', status: 'success' }, type: 'gauge' },
    ])

    return new Response(
      JSON.stringify({ ok: true, message_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const totalMs = Math.round(performance.now() - requestStart)
    const errStr = String(err)
    console.error("Edge function error:", err)
    logger.error(`Unhandled exception: ${errStr}`, { error: errStr })
    metrics.push([
      { name: 'email_send_total', value: 1, labels: { status: 'error', type: 'unknown' }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'send-email', status: 'error' }, type: 'gauge' },
    ])
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
