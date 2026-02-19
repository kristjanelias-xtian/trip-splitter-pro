import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createLogger } from '../_shared/logger.ts'
import { createMetrics } from '../_shared/metrics.ts'

const GITHUB_REPO = "kristjanelias-xtian/trip-splitter-pro"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const logger = createLogger('create-github-issue')
const metrics = createMetrics('create-github-issue')

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const requestStart = performance.now()

  try {
    logger.info('Request received', { method: req.method })

    const githubToken = Deno.env.get("GITHUB_TOKEN")
    if (!githubToken) {
      logger.error('GitHub token not configured')
      metrics.push([{ name: 'function_requests_total', value: 1, labels: { status: 'error', reason: 'missing_token' }, type: 'counter' }])
      return new Response(
        JSON.stringify({ error: "GitHub token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { title, body } = await req.json()

    if (!title || typeof title !== "string") {
      logger.warn('Invalid input: title missing or not a string')
      metrics.push([{ name: 'function_requests_total', value: 1, labels: { status: 'error', reason: 'invalid_input' }, type: 'counter' }])
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const githubStart = performance.now()
    logger.info('Calling GitHub API')

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title,
          body: body || "",
          labels: ["user-reported"],
        }),
      }
    )

    const githubLatencyMs = performance.now() - githubStart
    logger.info('GitHub API responded', { status: response.status, latencyMs: Math.round(githubLatencyMs) })
    metrics.push([{ name: 'github_api_latency_ms', value: Math.round(githubLatencyMs), labels: { service_name: 'create-github-issue' }, type: 'gauge' }])

    if (!response.ok) {
      const errorText = await response.text()
      console.error("GitHub API error:", response.status, errorText)
      logger.error('GitHub API returned error', { status: response.status })
      metrics.push([{ name: 'function_requests_total', value: 1, labels: { status: 'error', reason: 'github_api_error' }, type: 'counter' }])
      return new Response(
        JSON.stringify({ error: "Failed to create GitHub issue" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const issue = await response.json()
    const totalMs = Math.round(performance.now() - requestStart)
    logger.info('Issue created', { issueNumber: issue.number, totalMs })
    metrics.push([
      { name: 'function_requests_total', value: 1, labels: { status: 'success' }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'create-github-issue', status: 'success' }, type: 'gauge' },
    ])

    return new Response(
      JSON.stringify({ url: issue.html_url, number: issue.number }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const totalMs = Math.round(performance.now() - requestStart)
    console.error("Edge function error:", err)
    logger.error('Unhandled exception', { error: String(err) })
    metrics.push([
      { name: 'function_requests_total', value: 1, labels: { status: 'error', reason: 'unhandled_exception' }, type: 'counter' },
      { name: 'function_latency_ms', value: totalMs, labels: { service_name: 'create-github-issue', status: 'error' }, type: 'gauge' },
    ])
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
