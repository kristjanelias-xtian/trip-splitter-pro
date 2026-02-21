import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('send-email')
const metrics = createMetrics('send-email')

const APP_URL = 'https://split.xtian.me'
const FROM_ADDRESS = 'Spl1t <noreply@spl1t.me>'

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
    }

function invitationEmailHtml(params: {
  participantName: string
  organiserName: string
  tripName: string
  joinUrl: string
  tripUrl: string
}): string {
  const { participantName, organiserName, tripName, joinUrl, tripUrl } = params
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've been added to ${tripName} on Spl1t</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Spl1t</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Fair cost splitting for groups</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:600;">Hi ${participantName}!</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                <strong>${organiserName}</strong> has added you to <strong>${tripName}</strong> on Spl1t.
                Click below to view your balance and see what's been split so far.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${joinUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View your balance &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
              <!-- Info Box -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What is Spl1t?</p>
                <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
                  Spl1t tracks shared expenses in trips and events, then calculates the fairest way to settle up. No account needed — just click the link above.
                </p>
              </div>
              <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">
                Want to see all your splits in one place? <a href="${tripUrl}" style="color:#6366f1;text-decoration:none;">Sign in with Google</a> to link your account.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                You received this email because ${organiserName} added you to a trip on Spl1t.<br>
                <a href="${tripUrl}" style="color:#6366f1;text-decoration:none;">Open trip</a>
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

function paymentReminderEmailHtml(params: {
  recipientName: string
  organiserName: string
  tripName: string
  formattedAmount: string
  payToName: string
  tripUrl: string
}): string {
  const { recipientName, organiserName, tripName, formattedAmount, payToName, tripUrl } = params
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment reminder for ${tripName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Spl1t</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Payment Reminder</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:600;">Hi ${recipientName}!</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                This is a friendly reminder from <strong>${organiserName}</strong> about an outstanding balance from <strong>${tripName}</strong>.
              </p>
              <!-- Amount Box -->
              <div style="background:#faf5ff;border:2px solid #e9d5ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;color:#7c3aed;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You owe</p>
                <p style="margin:0 0 4px;color:#4c1d95;font-size:36px;font-weight:700;">${formattedAmount}</p>
                <p style="margin:0;color:#7c3aed;font-size:14px;">to <strong>${payToName}</strong></p>
              </div>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <a href="${tripUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View details &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">
                Questions? Reply to this email or contact ${organiserName} directly.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Sent by ${organiserName} via Spl1t &middot; <a href="${tripUrl}" style="color:#6366f1;text-decoration:none;">Open trip</a>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    logger.info('Request received', { method: req.method })

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
      subject = `You've been added to "${body.trip_name}" on Spl1t`
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
      subject = `Payment reminder for "${body.trip_name}"`
      html = paymentReminderEmailHtml({
        recipientName: body.recipient_name,
        organiserName: body.organiser_name,
        tripName: body.trip_name,
        formattedAmount,
        payToName: body.pay_to_name,
        tripUrl,
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

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [toEmail],
        subject,
        html,
      }),
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
