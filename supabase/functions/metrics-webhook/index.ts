// Supabase Edge Function for metrics data ingestion
// Deploy with: supabase functions deploy metrics-webhook
// Invoke: POST /functions/v1/metrics-webhook with JSON body

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Types
interface MetricDataPoint {
  metric_name: string
  metric_type: 'counter' | 'gauge' | 'histogram' | 'summary'
  value: number
  unit?: string
  dimensions?: Record<string, string | number>
  recorded_at?: string // ISO timestamp, defaults to now
}

interface WebhookPayload {
  source_slug: string
  data: MetricDataPoint | MetricDataPoint[]
}

interface WebhookResponse {
  success: boolean
  message: string
  inserted?: number
  errors?: string[]
}

// Validate metric data point
function validateMetricPoint(point: MetricDataPoint): string | null {
  if (!point.metric_name || typeof point.metric_name !== 'string') {
    return 'metric_name is required and must be a string'
  }
  if (!['counter', 'gauge', 'histogram', 'summary'].includes(point.metric_type)) {
    return 'metric_type must be one of: counter, gauge, histogram, summary'
  }
  if (typeof point.value !== 'number' || isNaN(point.value)) {
    return 'value must be a valid number'
  }
  if (point.recorded_at) {
    const date = new Date(point.recorded_at)
    if (isNaN(date.getTime())) {
      return 'recorded_at must be a valid ISO timestamp'
    }
  }
  return null
}

// Rate limiting: simple in-memory store (resets on cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per minute per source

function checkRateLimit(sourceSlug: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(sourceSlug)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(sourceSlug, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  entry.count++
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const payload: WebhookPayload = await req.json()

    // Validate payload structure
    if (!payload.source_slug) {
      return new Response(
        JSON.stringify({ success: false, message: 'source_slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.data) {
      return new Response(
        JSON.stringify({ success: false, message: 'data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    if (!checkRateLimit(payload.source_slug)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Rate limit exceeded. Max 100 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up source by slug
    const { data: source, error: sourceError } = await supabase
      .from('metrics_sources')
      .select('id, is_active, auth_config')
      .eq('slug', payload.source_slug)
      .single()

    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ success: false, message: `Source not found: ${payload.source_slug}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!source.is_active) {
      return new Response(
        JSON.stringify({ success: false, message: 'Source is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check webhook secret if configured
    const webhookSecret = source.auth_config?.webhook_secret
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret')
      if (providedSecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid webhook secret' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Normalize data to array
    const dataPoints = Array.isArray(payload.data) ? payload.data : [payload.data]

    // Validate all data points
    const errors: string[] = []
    const validPoints: MetricDataPoint[] = []

    for (let i = 0; i < dataPoints.length; i++) {
      const error = validateMetricPoint(dataPoints[i])
      if (error) {
        errors.push(`Point ${i}: ${error}`)
      } else {
        validPoints.push(dataPoints[i])
      }
    }

    if (validPoints.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No valid data points', errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare data for insertion
    const now = new Date().toISOString()
    const insertData = validPoints.map(point => ({
      source_id: source.id,
      metric_name: point.metric_name,
      metric_type: point.metric_type,
      value: point.value,
      unit: point.unit || null,
      dimensions: point.dimensions || {},
      recorded_at: point.recorded_at || now,
    }))

    // Insert data
    const { error: insertError } = await supabase
      .from('metrics_data')
      .insert(insertData)

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to insert data', errors: [insertError.message] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update source's last_refresh_at
    await supabase
      .from('metrics_sources')
      .update({ last_refresh_at: now, error_count: 0, last_error: null })
      .eq('id', source.id)

    // Success response
    const response: WebhookResponse = {
      success: true,
      message: `Inserted ${validPoints.length} data point(s)`,
      inserted: validPoints.length,
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
