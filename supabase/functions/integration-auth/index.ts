// Supabase Edge Function for OAuth2 integration flows
// Deploy with: supabase functions deploy integration-auth
// Invoke: POST /functions/v1/integration-auth
//
// Actions:
//   initiate — build OAuth2 authorization URL from integration config
//   callback — exchange authorization code for tokens, encrypt and store
//   refresh  — decrypt refresh token, call provider, re-encrypt new tokens

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { authenticateAgent } from "../_shared/agent-auth.ts";
import { Logger } from "../_shared/logger.ts";
import { validateInput, validateFields } from "../_shared/input-validator.ts";
import {
  encrypt,
  decrypt,
  reEncrypt,
  EncryptedPayload,
  CURRENT_KEY_ID,
} from "../_shared/encryption.ts";
import { CORS_ORIGIN } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Uses CURRENT_KEY_ID from encryption module for key rotation support (Issue #182)

interface OAuth2Config {
  client_id: string;
  client_secret: string;
  auth_url: string;
  token_url: string;
  scopes: string[];
  redirect_uri: string;
}

/**
 * Verify that an agent has access to a specific integration
 */
async function verifyAgentAccess(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  integrationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("agent_integrations")
    .select("agent_id")
    .eq("agent_id", agentId)
    .eq("integration_id", integrationId)
    .maybeSingle();

  return !error && data !== null;
}

/**
 * Fetch OAuth2 config from an integration record
 */
async function getOAuth2Config(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
): Promise<{ config: OAuth2Config; error?: string }> {
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("config, service_type")
    .eq("id", integrationId)
    .single();

  if (error || !integration) {
    return {
      config: null as unknown as OAuth2Config,
      error: "Integration not found",
    };
  }

  if (integration.service_type !== "oauth2") {
    return {
      config: null as unknown as OAuth2Config,
      error: "Integration is not OAuth2 type",
    };
  }

  const config = integration.config as unknown as OAuth2Config;
  if (!config.client_id || !config.token_url || !config.auth_url) {
    return {
      config: null as unknown as OAuth2Config,
      error: "Integration OAuth2 config is incomplete",
    };
  }

  return { config };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const logger = Logger.fromRequest(req);
  logger.logRequest();
  const start = performance.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate agent
    const auth = await authenticateAgent(req, supabase, logger);
    if (!auth.authenticated) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentId = auth.agent!.id;

    // Validate input
    const validation = await validateInput(req);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          message: validation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = validation.data as Record<string, unknown>;
    const fieldError = validateFields(body, {
      action: {
        required: true,
        type: "string",
        enum: ["initiate", "callback", "refresh"],
      },
      integration_id: { required: true, type: "string" },
    });
    if (fieldError) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: fieldError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { action, integration_id } = body as {
      action: string;
      integration_id: string;
    };

    // Verify agent access
    if (!(await verifyAgentAccess(supabase, agentId, integration_id))) {
      return new Response(
        JSON.stringify({
          error: "Agent does not have access to this integration",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get OAuth2 config
    const { config: oauthConfig, error: configError } = await getOAuth2Config(
      supabase,
      integration_id,
    );
    if (configError) {
      return new Response(JSON.stringify({ error: configError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let responseBody: unknown;

    switch (action) {
      case "initiate": {
        // Build OAuth2 authorization URL with server-side state storage (#271)
        const state = crypto.randomUUID();
        const scopes = (body.scopes as string[]) || oauthConfig.scopes || [];
        const redirectUri =
          (body.redirect_uri as string) || oauthConfig.redirect_uri;
        const initiatedBy = (body.initiated_by as string) || null;

        const params = new URLSearchParams({
          client_id: oauthConfig.client_id,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: scopes.join(" "),
          state,
        });

        const authUrl = `${oauthConfig.auth_url}?${params.toString()}`;

        // Store state for CSRF validation (#271)
        await supabase.from("oauth_states").insert({
          state,
          integration_id,
          agent_id: agentId,
          redirect_uri: redirectUri,
          initiated_by: initiatedBy,
        });

        logger.info("OAuth2 flow initiated", {
          integrationId: integration_id,
          state,
        });
        responseBody = { auth_url: authUrl, state };
        break;
      }

      case "callback": {
        // Exchange authorization code for tokens with state validation (#271)
        const callbackError = validateFields(body, {
          code: { required: true, type: "string" },
          state: { required: true, type: "string" },
        });
        if (callbackError) {
          return new Response(
            JSON.stringify({
              error: "Validation error",
              message: callbackError,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { code, state: callbackState } = body as {
          code: string;
          state: string;
        };

        // Verify state parameter (#271)
        const { data: storedState, error: stateError } = await supabase
          .from("oauth_states")
          .select("*")
          .eq("state", callbackState)
          .eq("integration_id", integration_id)
          .is("used_at", null)
          .single();

        if (stateError || !storedState) {
          logger.warn("OAuth2 state validation failed", {
            state: callbackState,
            integrationId: integration_id,
          });
          return new Response(
            JSON.stringify({ error: "Invalid or expired OAuth state" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (new Date(storedState.expires_at) < new Date()) {
          logger.warn("OAuth2 state expired", { state: callbackState });
          return new Response(
            JSON.stringify({
              error: "OAuth state has expired, please try again",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Mark state as used
        await supabase
          .from("oauth_states")
          .update({ used_at: new Date().toISOString() })
          .eq("id", storedState.id);

        // Exchange code for tokens
        const tokenResponse = await fetch(oauthConfig.token_url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: oauthConfig.client_id,
            client_secret: oauthConfig.client_secret,
            redirect_uri: oauthConfig.redirect_uri,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          logger.error("OAuth2 token exchange failed", new Error(errorText));
          return new Response(
            JSON.stringify({
              error: "Token exchange failed",
              details: errorText,
            }),
            {
              status: 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const tokens = (await tokenResponse.json()) as Record<string, unknown>;

        // Encrypt and store tokens
        const encrypted = await encrypt(tokens, CURRENT_KEY_ID);

        // Calculate expiry if provided
        const expiresIn = tokens.expires_in as number | undefined;
        const expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null;

        const { data: cred, error: insertError } = await supabase
          .from("integration_credentials")
          .insert({
            integration_id,
            agent_id: agentId,
            credential_type: "oauth2_token",
            encrypted_data: JSON.stringify(encrypted),
            encryption_key_id: CURRENT_KEY_ID,
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (insertError) {
          logger.error(
            "Failed to store OAuth2 tokens",
            insertError as unknown as Error,
          );
          return new Response(
            JSON.stringify({ error: "Failed to store tokens" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        logger.info("OAuth2 tokens stored", {
          credentialId: cred.id,
          integrationId: integration_id,
        });
        responseBody = {
          credential_id: cred.id,
          token_type: tokens.token_type || "bearer",
          expires_at: expiresAt,
          has_refresh_token: !!tokens.refresh_token,
        };
        break;
      }

      case "refresh": {
        // Refresh OAuth2 tokens
        const refreshError = validateFields(body, {
          credential_id: { required: true, type: "string" },
        });
        if (refreshError) {
          return new Response(
            JSON.stringify({
              error: "Validation error",
              message: refreshError,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { credential_id } = body as { credential_id: string };

        // Fetch existing credential
        const { data: cred, error: fetchError } = await supabase
          .from("integration_credentials")
          .select("*")
          .eq("id", credential_id)
          .eq("integration_id", integration_id)
          .single();

        if (fetchError || !cred) {
          return new Response(
            JSON.stringify({ error: "Credential not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Decrypt to get refresh token
        const encryptedPayload = JSON.parse(
          cred.encrypted_data,
        ) as EncryptedPayload;
        const existingTokens = await decrypt(encryptedPayload);

        if (!existingTokens.refresh_token) {
          return new Response(
            JSON.stringify({ error: "No refresh token available" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Call provider's token endpoint with refresh_token grant
        const tokenResponse = await fetch(oauthConfig.token_url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: existingTokens.refresh_token as string,
            client_id: oauthConfig.client_id,
            client_secret: oauthConfig.client_secret,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          logger.error("OAuth2 token refresh failed", new Error(errorText));
          return new Response(
            JSON.stringify({
              error: "Token refresh failed",
              details: errorText,
            }),
            {
              status: 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const newTokens = (await tokenResponse.json()) as Record<
          string,
          unknown
        >;

        // Preserve refresh_token if provider didn't return a new one
        if (!newTokens.refresh_token && existingTokens.refresh_token) {
          newTokens.refresh_token = existingTokens.refresh_token;
        }

        // Re-encrypt and update
        const encrypted = await encrypt(newTokens, CURRENT_KEY_ID);
        const expiresIn = newTokens.expires_in as number | undefined;
        const expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null;

        const { error: updateError } = await supabase
          .from("integration_credentials")
          .update({
            encrypted_data: JSON.stringify(encrypted),
            encryption_key_id: CURRENT_KEY_ID,
            expires_at: expiresAt,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", credential_id);

        if (updateError) {
          logger.error(
            "Failed to update refreshed tokens",
            updateError as unknown as Error,
          );
          return new Response(
            JSON.stringify({ error: "Failed to update tokens" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        logger.info("OAuth2 tokens refreshed", { credentialId: credential_id });
        responseBody = {
          credential_id,
          token_type: newTokens.token_type || "bearer",
          expires_at: expiresAt,
          refreshed: true,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    const duration = Math.round(performance.now() - start);
    logger.logResponse(200, duration);

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...logger.getResponseHeaders(),
      },
    });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error("Integration auth error", error as Error);
    logger.logResponse(500, duration);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  }
});
