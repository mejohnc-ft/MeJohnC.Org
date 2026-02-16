// Supabase Edge Function for agent authentication
// Deploy with: supabase functions deploy agent-auth
// Invoke: POST /functions/v1/agent-auth with X-Agent-Key header

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { authenticateAgent, extractApiKey } from '../_shared/agent-auth.ts'
import { Logger } from '../_shared/logger.ts'
import { CORS_ORIGIN } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-agent-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const logger = Logger.fromRequest(req)
  logger.logRequest()
  const start = performance.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const auth = await authenticateAgent(req, supabase, logger)

    if (!auth.authenticated) {
      // Log failed auth attempt to audit_log
      const apiKey = extractApiKey(req)
      const keyPrefix = apiKey ? apiKey.substring(0, 17) + '...' : 'none'

      await supabase.rpc('log_audit_event', {
        p_actor_type: 'system',
        p_actor_id: auth.agent?.id || null,
        p_action: 'agent_auth.failed',
        p_resource_type: 'agent',
        p_resource_id: auth.agent?.id || null,
        p_details: {
          error: auth.error,
          key_prefix: keyPrefix,
          ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        },
      })

      const duration = Math.round(performance.now() - start)
      logger.logResponse(auth.status || 401, duration)

      const responseBody: Record<string, unknown> = {
        error: auth.error,
        correlationId: logger.getCorrelationId(),
      }

      if (auth.rateLimit) {
        responseBody.rateLimit = auth.rateLimit
      }

      return new Response(JSON.stringify(responseBody), {
        status: auth.status || 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...logger.getResponseHeaders(),
        },
      })
    }

    // Log successful auth to audit_log
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: auth.agent!.id,
      p_action: 'agent_auth.success',
      p_resource_type: 'agent',
      p_resource_id: auth.agent!.id,
      p_details: {
        agent_name: auth.agent!.name,
        agent_type: auth.agent!.type,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      },
    })

    const duration = Math.round(performance.now() - start)
    logger.logResponse(200, duration)

    return new Response(
      JSON.stringify({
        authenticated: true,
        agent: {
          id: auth.agent!.id,
          name: auth.agent!.name,
          type: auth.agent!.type,
          capabilities: auth.agent!.capabilities,
          metadata: auth.agent!.metadata,
        },
        rateLimit: auth.rateLimit,
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...logger.getResponseHeaders(),
        },
      }
    )
  } catch (error) {
    const duration = Math.round(performance.now() - start)
    logger.error('Agent auth endpoint error', error as Error)
    logger.logResponse(500, duration)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...logger.getResponseHeaders(),
        },
      }
    )
  }
})
