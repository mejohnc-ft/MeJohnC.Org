// Supabase Edge Function for health checks
// Deploy with: supabase functions deploy health-check
// Invoke: GET /functions/v1/health-check

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: CheckResult
    auth: CheckResult
    storage: CheckResult
  }
  responseTime: number
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn'
  latency?: number
  message?: string
}

// Track uptime (resets on cold start)
const startTime = Date.now()

async function checkDatabase(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
  const start = Date.now()
  try {
    // Simple query to check database connectivity
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    const latency = Date.now() - start

    if (error) {
      // Table might not exist, but connection worked
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return { status: 'pass', latency, message: 'Database connected (table check skipped)' }
      }
      return { status: 'fail', latency, message: error.message }
    }

    // Warn if latency is high
    if (latency > 1000) {
      return { status: 'warn', latency, message: 'High latency detected' }
    }

    return { status: 'pass', latency }
  } catch (err) {
    return { status: 'fail', latency: Date.now() - start, message: err.message }
  }
}

async function checkAuth(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
  const start = Date.now()
  try {
    // Check if auth is reachable
    const { error } = await supabase.auth.getSession()
    const latency = Date.now() - start

    // No session is fine - we're checking if auth service is responsive
    if (error && !error.message.includes('session')) {
      return { status: 'fail', latency, message: error.message }
    }

    if (latency > 500) {
      return { status: 'warn', latency, message: 'High latency detected' }
    }

    return { status: 'pass', latency }
  } catch (err) {
    return { status: 'fail', latency: Date.now() - start, message: err.message }
  }
}

async function checkStorage(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
  const start = Date.now()
  try {
    // List buckets to check storage connectivity
    const { error } = await supabase.storage.listBuckets()
    const latency = Date.now() - start

    if (error) {
      return { status: 'fail', latency, message: error.message }
    }

    if (latency > 500) {
      return { status: 'warn', latency, message: 'High latency detected' }
    }

    return { status: 'pass', latency }
  } catch (err) {
    return { status: 'fail', latency: Date.now() - start, message: err.message }
  }
}

function determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const results = Object.values(checks)

  // If any check failed, unhealthy
  if (results.some(r => r.status === 'fail')) {
    return 'unhealthy'
  }

  // If any check has warnings, degraded
  if (results.some(r => r.status === 'warn')) {
    return 'degraded'
  }

  return 'healthy'
}

Deno.serve(async (req) => {
  const requestStart = Date.now()

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Run health checks in parallel
    const [database, auth, storage] = await Promise.all([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkStorage(supabase),
    ])

    const checks = { database, auth, storage }
    const status = determineOverallStatus(checks)

    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      version: Deno.env.get('DENO_DEPLOYMENT_ID') || 'local',
      uptime: Math.floor((Date.now() - startTime) / 1000), // seconds
      checks,
      responseTime: Date.now() - requestStart,
    }

    // Return appropriate HTTP status code
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: httpStatus,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    )
  } catch (error) {
    const result = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Internal server error',
      responseTime: Date.now() - requestStart,
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    )
  }
})
