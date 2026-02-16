// Supabase Edge Function for integration credential management
// Deploy with: supabase functions deploy integration-credentials
// Invoke: POST /functions/v1/integration-credentials
//
// Actions:
//   store    — encrypt credentials and store in integration_credentials
//   retrieve — verify agent access via agent_integrations, decrypt and return
//   delete   — remove credentials
//   list     — list credential metadata (no decryption)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { authenticateAgent } from '../_shared/agent-auth.ts'
import { Logger } from '../_shared/logger.ts'
import { validateInput, validateFields } from '../_shared/input-validator.ts'
import { encrypt, decrypt, EncryptedPayload } from '../_shared/encryption.ts'
import { CORS_ORIGIN } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-agent-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ENCRYPTION_KEY_ID = 'key-v1'

/**
 * Verify that an agent has access to a specific integration
 */
async function verifyAgentAccess(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  integrationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('agent_integrations')
    .select('agent_id')
    .eq('agent_id', agentId)
    .eq('integration_id', integrationId)
    .maybeSingle()

  return !error && data !== null
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate agent
    const auth = await authenticateAgent(req, supabase, logger)
    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const agentId = auth.agent!.id

    // Validate input
    const validation = await validateInput(req)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Validation error', message: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = validation.data as Record<string, unknown>
    const fieldError = validateFields(body, {
      action: {
        required: true,
        type: 'string',
        enum: ['store', 'retrieve', 'delete', 'list'],
      },
    })
    if (fieldError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', message: fieldError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action } = body as { action: string }
    let responseBody: unknown
    let responseStatus = 200

    switch (action) {
      case 'store': {
        const storeError = validateFields(body, {
          integration_id: { required: true, type: 'string' },
          credential_type: {
            required: true,
            type: 'string',
            enum: ['oauth2_token', 'api_key', 'service_account', 'custom'],
          },
          credentials: { required: true, type: 'object' },
        })
        if (storeError) {
          return new Response(
            JSON.stringify({ error: 'Validation error', message: storeError }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { integration_id, credential_type, credentials, expires_at } = body as {
          integration_id: string
          credential_type: string
          credentials: Record<string, unknown>
          expires_at?: string
        }

        // Verify agent has access to this integration
        if (!(await verifyAgentAccess(supabase, agentId, integration_id))) {
          return new Response(
            JSON.stringify({ error: 'Agent does not have access to this integration' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Encrypt credentials
        const encrypted = await encrypt(credentials, ENCRYPTION_KEY_ID)

        // Store
        const { data: cred, error: insertError } = await supabase
          .from('integration_credentials')
          .insert({
            integration_id,
            agent_id: agentId,
            credential_type,
            encrypted_data: JSON.stringify(encrypted),
            encryption_key_id: ENCRYPTION_KEY_ID,
            expires_at: expires_at || null,
          })
          .select('id, credential_type, created_at')
          .single()

        if (insertError) {
          logger.error('Failed to store credentials', insertError as unknown as Error)
          return new Response(
            JSON.stringify({ error: 'Failed to store credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        logger.info('Credentials stored', { credentialId: cred.id, integrationId: integration_id })
        responseBody = { stored: true, credential_id: cred.id }
        break
      }

      case 'retrieve': {
        const retrieveError = validateFields(body, {
          credential_id: { required: true, type: 'string' },
        })
        if (retrieveError) {
          return new Response(
            JSON.stringify({ error: 'Validation error', message: retrieveError }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { credential_id } = body as { credential_id: string }

        // Fetch credential
        const { data: cred, error: fetchError } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('id', credential_id)
          .single()

        if (fetchError || !cred) {
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify agent access to the integration
        if (!(await verifyAgentAccess(supabase, agentId, cred.integration_id))) {
          return new Response(
            JSON.stringify({ error: 'Agent does not have access to this integration' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check expiry
        if (cred.expires_at && new Date(cred.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: 'Credential has expired', expires_at: cred.expires_at }),
            { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Decrypt
        const encryptedPayload = JSON.parse(cred.encrypted_data) as EncryptedPayload
        const decrypted = await decrypt(encryptedPayload)

        // Update last_used_at
        await supabase
          .from('integration_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', credential_id)

        logger.info('Credentials retrieved', { credentialId: credential_id })
        responseBody = {
          credential_id: cred.id,
          credential_type: cred.credential_type,
          credentials: decrypted,
          expires_at: cred.expires_at,
        }
        break
      }

      case 'delete': {
        const deleteError = validateFields(body, {
          credential_id: { required: true, type: 'string' },
        })
        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Validation error', message: deleteError }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { credential_id } = body as { credential_id: string }

        // Fetch to verify access
        const { data: cred, error: fetchError } = await supabase
          .from('integration_credentials')
          .select('integration_id')
          .eq('id', credential_id)
          .single()

        if (fetchError || !cred) {
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!(await verifyAgentAccess(supabase, agentId, cred.integration_id))) {
          return new Response(
            JSON.stringify({ error: 'Agent does not have access to this integration' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: deleteDbError } = await supabase
          .from('integration_credentials')
          .delete()
          .eq('id', credential_id)

        if (deleteDbError) {
          logger.error('Failed to delete credential', deleteDbError as unknown as Error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete credential' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        logger.info('Credential deleted', { credentialId: credential_id })
        responseBody = { deleted: true, credential_id }
        break
      }

      case 'list': {
        const integrationId = body.integration_id as string | undefined

        let query = supabase
          .from('integration_credentials')
          .select('id, integration_id, credential_type, expires_at, last_used_at, created_at')
          .eq('agent_id', agentId)

        if (integrationId) {
          // Verify access before filtering
          if (!(await verifyAgentAccess(supabase, agentId, integrationId))) {
            return new Response(
              JSON.stringify({ error: 'Agent does not have access to this integration' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          query = query.eq('integration_id', integrationId)
        }

        const { data: credentials, error: listError } = await query.order('created_at', {
          ascending: false,
        })

        if (listError) {
          logger.error('Failed to list credentials', listError as unknown as Error)
          return new Response(
            JSON.stringify({ error: 'Failed to list credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        responseBody = { credentials }
        break
      }

      default:
        responseStatus = 400
        responseBody = { error: `Unknown action: ${action}` }
    }

    const duration = Math.round(performance.now() - start)
    logger.logResponse(responseStatus, duration)

    return new Response(JSON.stringify(responseBody), {
      status: responseStatus,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...logger.getResponseHeaders(),
      },
    })
  } catch (error) {
    const duration = Math.round(performance.now() - start)
    logger.error('Integration credentials error', error as Error)
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
