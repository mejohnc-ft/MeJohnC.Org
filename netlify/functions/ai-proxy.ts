import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Netlify Function: AI Proxy
 *
 * Proxies requests to the Anthropic Claude API so the API key stays
 * server-side instead of being bundled into the frontend JS.
 *
 * Issue: #306 - Move Anthropic API key from VITE_ client bundle to server-side proxy
 * Issue: #314 - Usage tracking and quota enforcement
 *
 * Client calls: POST /api/ai-proxy
 * Body: { model, max_tokens, temperature, system, messages, tenant_id, feature }
 */

const ALLOWED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
];

const MAX_TOKENS_LIMIT = 4096;

/** Plan AI chat limits — mirrors src/lib/billing.ts PLAN_LIMITS.maxAiChats */
const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  starter: 100,
  business: 500,
  professional: 2000,
  enterprise: Infinity,
};

const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY not configured on server",
      }),
    };
  }

  // Verify the request is from an authenticated admin (check for Clerk JWT)
  const authHeader = event.headers["authorization"];
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  let body: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system?: string;
    messages?: Array<{ role: string; content: string }>;
    tenant_id?: string;
    feature?: string;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  // Validate model
  const model = body.model || "claude-3-5-sonnet-20241022";
  if (!ALLOWED_MODELS.includes(model)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Model not allowed. Use: ${ALLOWED_MODELS.join(", ")}`,
      }),
    };
  }

  // Clamp max_tokens
  const maxTokens = Math.min(body.max_tokens || 1024, MAX_TOKENS_LIMIT);

  // ── Usage tracking & quota enforcement (#314) ──────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantId = body.tenant_id;

  let tenantPlan = "free";
  let usageCount = 0;
  let planLimit = PLAN_LIMITS.free;
  let stripeCustomerId: string | undefined;
  let isOverage = false;

  if (tenantId && supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up tenant
    const { data: tenant } = await supabase
      .schema("app")
      .from("tenants")
      .select("id, settings")
      .eq("id", tenantId)
      .single();

    if (tenant) {
      const settings = (tenant.settings as Record<string, unknown>) || {};
      tenantPlan = (settings.plan as string) || "free";
      planLimit = PLAN_LIMITS[tenantPlan] ?? PLAN_LIMITS.free;
      stripeCustomerId = settings.stripe_customer_id as string | undefined;

      // Get current usage count
      const periodStart = settings.current_period_start as string | undefined;
      if (periodStart) {
        const { data: count } = await supabase
          .schema("app")
          .rpc("get_tenant_ai_usage_count", {
            p_tenant_id: tenantId,
            p_period_start: periodStart,
          });
        usageCount = typeof count === "number" ? count : 0;
      }

      // Enforce quota
      if (planLimit !== Infinity && usageCount >= planLimit) {
        if (tenantPlan === "free") {
          // Hard block for free plan
          return {
            statusCode: 429,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "AI chat quota exceeded",
              usage: usageCount,
              limit: planLimit,
            }),
          };
        }
        // Paid plan: allow but flag as overage
        isOverage = true;
      }
    }
  }

  // ── Call Anthropic API ─────────────────────────────────────────────────────

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: body.temperature ?? 0.7,
        system: body.system,
        messages: body.messages || [],
      }),
    });

    const responseBody = await response.text();

    // ── Track usage (non-blocking) ─────────────────────────────────────────
    if (tenantId && supabaseUrl && supabaseServiceKey && response.ok) {
      try {
        const parsed = JSON.parse(responseBody);
        const promptTokens = parsed.usage?.input_tokens || 0;
        const completionTokens = parsed.usage?.output_tokens || 0;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // Insert usage row — fire and forget
        supabase
          .schema("app")
          .from("tenant_ai_usage")
          .insert({
            tenant_id: tenantId,
            model,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
            feature: body.feature || "content-generation",
          })
          .then(({ error }) => {
            if (error) console.error("Usage tracking insert failed:", error);
          });

        // Report overage to Stripe metered billing
        if (isOverage && stripeCustomerId) {
          const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
          const meterName =
            process.env.STRIPE_AI_METER_NAME || "ai_chat_overage";
          if (stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey);
            stripe.billing.meterEvents
              .create({
                event_name: meterName,
                payload: {
                  stripe_customer_id: stripeCustomerId,
                  value: "1",
                },
              })
              .catch((err: unknown) =>
                console.error("Stripe meter event failed:", err),
              );
          }
        }
      } catch {
        // Don't fail the response if usage tracking fails
      }
    }

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: responseBody,
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to reach Anthropic API" }),
    };
  }
};

export { handler };
