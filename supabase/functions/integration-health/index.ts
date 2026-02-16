// Supabase Edge Function: Integration Health Checker
// Deploy with: supabase functions deploy integration-health
// Invoke: POST /functions/v1/integration-health
//
// Called hourly by pg_cron to check health of all active integrations.
// Auth: scheduler secret only (not agent auth).
//
// Health check strategies by service_type:
//   - oauth2: GET health_check_url with decrypted Bearer token
//   - api_key: GET health_check_url with X-Api-Key header
//   - webhook: HEAD request to the webhook URL
//   - custom: config-based check (GET with custom headers)
//
// Issue: #157

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { decrypt, EncryptedPayload } from '../_shared/encryption.ts'
import { Logger } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const HEALTH_CHECK_TIMEOUT_MS = 10000 // 10 seconds per check

interface Integration {
  id: string
  service_name: string
  service_type: 'oauth2' | 'api_key' | 'webhook' | 'custom'
  display_name: string
  config: Record<string, unknown> | null
  status: string
  health_check_url: string | null
}

interface HealthCheckResult {
  integration_id: string
  service_name: string
  previous_status: string
  new_status: 'active' | 'error'
  response_time_ms: number
  error?: string
}

/**
 * Fetch with a timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Run health check for a single integration
 */
async function checkIntegration(
  integration: Integration,
  supabase: ReturnType<typeof createClient>,
  logger: Logger
): Promise<HealthCheckResult> {
  const start = performance.now()
  const result: HealthCheckResult = {
    integration_id: integration.id,
    service_name: integration.service_name,
    previous_status: integration.status,
    new_status: 'active',
    response_time_ms: 0,
  }

  try {
    const healthUrl = integration.health_check_url
    if (!healthUrl) {
      // No health check URL configured — skip but keep current status
      result.response_time_ms = Math.round(performance.now() - start)
      result.new_status = integration.status === 'error' ? 'error' : 'active'
      return result
    }

    let response: Response

    switch (integration.service_type) {
      case 'oauth2': {
        // Decrypt the stored credentials to get the access token
        let token = ''
        try {
          const { data: credRow } = await supabase
            .from('integration_credentials')
            .select('encrypted_data')
            .eq('integration_id', integration.id)
            .single()

          if (credRow?.encrypted_data) {
            const decrypted = await decrypt(credRow.encrypted_data as EncryptedPayload)
            token = (decrypted.access_token as string) || ''
          }
        } catch {
          // If we can't decrypt, the integration is unhealthy
          result.new_status = 'error'
          result.error = 'Failed to decrypt credentials'
          result.response_time_ms = Math.round(performance.now() - start)
          return result
        }

        response = await fetchWithTimeout(
          healthUrl,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          },
          HEALTH_CHECK_TIMEOUT_MS
        )
        break
      }

      case 'api_key': {
        // Decrypt credentials to get API key
        let apiKey = ''
        try {
          const { data: credRow } = await supabase
            .from('integration_credentials')
            .select('encrypted_data')
            .eq('integration_id', integration.id)
            .single()

          if (credRow?.encrypted_data) {
            const decrypted = await decrypt(credRow.encrypted_data as EncryptedPayload)
            apiKey = (decrypted.api_key as string) || ''
          }
        } catch {
          result.new_status = 'error'
          result.error = 'Failed to decrypt credentials'
          result.response_time_ms = Math.round(performance.now() - start)
          return result
        }

        const headerName = (integration.config?.api_key_header as string) || 'X-Api-Key'
        response = await fetchWithTimeout(
          healthUrl,
          {
            method: 'GET',
            headers: {
              [headerName]: apiKey,
              'Accept': 'application/json',
            },
          },
          HEALTH_CHECK_TIMEOUT_MS
        )
        break
      }

      case 'webhook': {
        // Simple HEAD request to check if the URL is reachable
        response = await fetchWithTimeout(
          healthUrl,
          { method: 'HEAD' },
          HEALTH_CHECK_TIMEOUT_MS
        )
        break
      }

      case 'custom': {
        // Config-based check with custom headers
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        }

        // Merge custom headers from config
        const customHeaders = integration.config?.health_check_headers as Record<string, string>
        if (customHeaders) {
          Object.assign(headers, customHeaders)
        }

        const method = (integration.config?.health_check_method as string) || 'GET'

        response = await fetchWithTimeout(
          healthUrl,
          { method, headers },
          HEALTH_CHECK_TIMEOUT_MS
        )
        break
      }

      default:
        result.new_status = 'error'
        result.error = `Unknown service type: ${integration.service_type}`
        result.response_time_ms = Math.round(performance.now() - start)
        return result
    }

    // Check response status
    if (response.ok) {
      result.new_status = 'active'
    } else {
      result.new_status = 'error'
      result.error = `Health check returned HTTP ${response.status}`
    }
  } catch (error) {
    result.new_status = 'error'
    if ((error as Error).name === 'AbortError') {
      result.error = `Health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`
    } else {
      result.error = (error as Error).message
    }
  }

  result.response_time_ms = Math.round(performance.now() - start)
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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
    // Auth: scheduler secret only
    const schedulerSecret = req.headers.get('x-scheduler-secret')
    const expectedSecret = Deno.env.get('SCHEDULER_SECRET')

    if (!expectedSecret) {
      logger.error('SCHEDULER_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Health checker not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (schedulerSecret !== expectedSecret) {
      logger.warn('Invalid scheduler secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all active integrations
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, service_name, service_type, display_name, config, status, health_check_url')
      .in('status', ['active', 'error'])

    if (fetchError) {
      logger.error('Failed to fetch integrations', fetchError as unknown as Error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integrations || integrations.length === 0) {
      const duration = Math.round(performance.now() - start)
      logger.info('No integrations to check')
      logger.logResponse(200, duration)
      return new Response(
        JSON.stringify({ checked: 0, results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logger.info('Starting health checks', { count: integrations.length })

    // Run all health checks in parallel
    const results = await Promise.allSettled(
      integrations.map((integration) =>
        checkIntegration(integration as Integration, supabase, logger)
      )
    )

    // Process results and update statuses
    const checkResults: HealthCheckResult[] = []
    let statusChanges = 0

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const check = result.value
        checkResults.push(check)

        // Update integration status and health_checked_at
        const { error: updateError } = await supabase
          .from('integrations')
          .update({
            status: check.new_status,
            health_checked_at: new Date().toISOString(),
          })
          .eq('id', check.integration_id)

        if (updateError) {
          logger.warn('Failed to update integration status', {
            integrationId: check.integration_id,
            error: updateError.message,
          })
        }

        // Log status changes
        if (check.previous_status !== check.new_status) {
          statusChanges++
          logger.info('Integration status changed', {
            integrationId: check.integration_id,
            serviceName: check.service_name,
            from: check.previous_status,
            to: check.new_status,
            error: check.error,
          })

          // Emit event for status change
          await supabase.rpc('emit_event', {
            p_event_type: check.new_status === 'error'
              ? 'integration.error'
              : 'integration.connected',
            p_payload: {
              integration_id: check.integration_id,
              service_name: check.service_name,
              previous_status: check.previous_status,
              new_status: check.new_status,
              error: check.error || null,
            },
            p_source_type: 'system',
            p_source_id: 'integration-health',
          })
        }
      } else {
        logger.error('Health check promise rejected', new Error(String(result.reason)))
      }
    }

    const duration = Math.round(performance.now() - start)

    // Audit log
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'scheduler',
      p_actor_id: null,
      p_action: 'integration.health_check',
      p_resource_type: 'integration',
      p_resource_id: null,
      p_details: {
        checked: checkResults.length,
        healthy: checkResults.filter(r => r.new_status === 'active').length,
        unhealthy: checkResults.filter(r => r.new_status === 'error').length,
        status_changes: statusChanges,
        duration_ms: duration,
      },
    })

    logger.logResponse(200, duration)

    return new Response(
      JSON.stringify({
        checked: checkResults.length,
        healthy: checkResults.filter(r => r.new_status === 'active').length,
        unhealthy: checkResults.filter(r => r.new_status === 'error').length,
        status_changes: statusChanges,
        results: checkResults,
        duration_ms: duration,
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
    logger.error('Integration health checker error', error as Error)
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
