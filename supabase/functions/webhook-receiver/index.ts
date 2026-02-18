// Supabase Edge Function: Webhook Receiver
// Deploy with: supabase functions deploy webhook-receiver
// Invoke: POST /functions/v1/webhook-receiver
//
// Receives webhooks from external services and dispatches them to workflows.
// No agent auth required (external services authenticate via webhook-specific signatures).
//
// Flow:
// 1. Extract webhook_id from body or query param
// 2. Look up workflow by trigger_config->>'webhook_id'
// 3. Validate signature if configured (HMAC-SHA256, Stripe-style, GitHub-style)
// 4. Dispatch to workflow-executor with trigger_type: 'webhook'
//
// Issue: #156

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Logger } from "../_shared/logger.ts";
import { validateInput } from "../_shared/input-validator.ts";
import { PersistentRateLimiter, getClientId } from "../_shared/rate-limiter.ts";
import { CORS_ORIGIN } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature, stripe-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Persistent rate limiter: 100 requests per minute per webhook_id
// Backed by Supabase rate_limit_buckets table — survives cold starts (Issue #181)
let webhookLimiter: PersistentRateLimiter | null = null;

/**
 * Compute HMAC-SHA256 hex digest using Web Crypto API
 */
async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time comparison for signature verification
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify webhook signature based on the configured format.
 * Supports:
 *   - hmac_sha256: raw HMAC-SHA256 hex in X-Webhook-Signature header
 *   - stripe: Stripe-style "t=<ts>,v1=<sig>" in Stripe-Signature header
 *   - github: GitHub-style "sha256=<sig>" in X-Hub-Signature-256 header
 */
async function verifyWebhookSignature(
  req: Request,
  rawBody: string,
  config: Record<string, unknown>,
  logger: Logger,
): Promise<boolean> {
  const sigFormat = config.signature_format as string;
  const sigSecret = config.signature_secret as string;

  if (!sigFormat || !sigSecret) {
    // No signature verification configured — allow
    return true;
  }

  switch (sigFormat) {
    case "hmac_sha256": {
      const header = req.headers.get("x-webhook-signature");
      if (!header) {
        logger.warn("Missing X-Webhook-Signature header");
        return false;
      }
      const expected = await hmacSha256Hex(sigSecret, rawBody);
      return timingSafeEqual(expected, header);
    }

    case "stripe": {
      const header = req.headers.get("stripe-signature");
      if (!header) {
        logger.warn("Missing Stripe-Signature header");
        return false;
      }
      // Parse "t=<timestamp>,v1=<signature>"
      const parts: Record<string, string> = {};
      for (const part of header.split(",")) {
        const [key, value] = part.split("=", 2);
        if (key && value) parts[key.trim()] = value.trim();
      }

      if (!parts.t || !parts.v1) {
        logger.warn("Invalid Stripe-Signature format");
        return false;
      }

      // Stripe signs: "<timestamp>.<raw_body>"
      const signedPayload = `${parts.t}.${rawBody}`;
      const expected = await hmacSha256Hex(sigSecret, signedPayload);
      return timingSafeEqual(expected, parts.v1);
    }

    case "github": {
      const header = req.headers.get("x-hub-signature-256");
      if (!header) {
        logger.warn("Missing X-Hub-Signature-256 header");
        return false;
      }
      // GitHub format: "sha256=<hex_digest>"
      const sig = header.startsWith("sha256=") ? header.slice(7) : header;
      const expected = await hmacSha256Hex(sigSecret, rawBody);
      return timingSafeEqual(expected, sig);
    }

    default:
      logger.warn("Unknown signature format", { sigFormat });
      return false;
  }
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
    // Validate input with 1MB limit
    const validation = await validateInput(req, { maxBodySize: 1024 * 1024 });
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

    // Supabase client (created early for persistent rate limiting)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lazy-init persistent rate limiter (reused across requests within same instance)
    if (!webhookLimiter) {
      webhookLimiter = new PersistentRateLimiter(supabase, {
        maxRequests: 100,
        windowMs: 60000,
        keyPrefix: "webhook",
      });
    }

    // Extract webhook_id from body or URL query param
    const url = new URL(req.url);
    const webhookId =
      (body.webhook_id as string) || url.searchParams.get("webhook_id");

    if (!webhookId) {
      return new Response(
        JSON.stringify({
          error: "Missing webhook_id in body or query parameter",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Rate limit per webhook_id (persistent across cold starts — Issue #181)
    const rateResult = await webhookLimiter.check(webhookId);
    if (!rateResult.allowed) {
      logger.warn("Webhook rate limit exceeded", {
        webhookId,
        retryAfter: rateResult.retryAfter,
      });
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: rateResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...webhookLimiter.getHeaders(rateResult),
          },
        },
      );
    }

    // Look up workflow by webhook_id in trigger_config
    const { data: workflows, error: wfError } = await supabase
      .from("workflows")
      .select("id, name, trigger_config")
      .eq("is_active", true)
      .eq("trigger_type", "webhook")
      .filter("trigger_config->>webhook_id", "eq", webhookId);

    if (wfError) {
      logger.error("Failed to look up workflows", wfError as unknown as Error);
      return new Response(
        JSON.stringify({
          error: "Internal error looking up webhook configuration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!workflows || workflows.length === 0) {
      logger.warn("No workflow found for webhook_id", { webhookId });
      return new Response(
        JSON.stringify({
          error: "No active workflow found for this webhook_id",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const workflow = workflows[0];
    const triggerConfig =
      (workflow.trigger_config as Record<string, unknown>) || {};

    // Verify webhook signature if configured
    const rawBody = JSON.stringify(body);
    const sigValid = await verifyWebhookSignature(
      req,
      rawBody,
      triggerConfig,
      logger,
    );
    if (!sigValid) {
      logger.warn("Webhook signature verification failed", {
        webhookId,
        workflowId: workflow.id,
      });
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Dispatch to workflow-executor
    const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
    if (!schedulerSecret) {
      logger.error("SCHEDULER_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook dispatch not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const dispatchResponse = await fetch(
      `${supabaseUrl}/functions/v1/workflow-executor`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scheduler-secret": schedulerSecret,
          "x-correlation-id": logger.getCorrelationId(),
        },
        body: JSON.stringify({
          workflow_id: workflow.id,
          trigger_type: "webhook",
          trigger_data: {
            webhook_id: webhookId,
            payload: body,
            headers: {
              "content-type": req.headers.get("content-type"),
              "user-agent": req.headers.get("user-agent"),
            },
            source_ip: getClientId(req),
            received_at: new Date().toISOString(),
          },
        }),
      },
    );

    const dispatchData = await dispatchResponse.json();
    const duration = Math.round(performance.now() - start);

    // Audit log
    await supabase.rpc("log_audit_event", {
      p_actor_type: "system",
      p_actor_id: null,
      p_action: "webhook.received",
      p_resource_type: "workflow",
      p_resource_id: workflow.id,
      p_details: {
        webhook_id: webhookId,
        workflow_name: workflow.name,
        dispatch_status: dispatchResponse.status,
        duration_ms: duration,
      },
    });

    logger.logResponse(200, duration);

    return new Response(
      JSON.stringify({
        received: true,
        webhook_id: webhookId,
        workflow_id: workflow.id,
        run_id: dispatchData.run_id || null,
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error("Webhook receiver error", error as Error);
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
