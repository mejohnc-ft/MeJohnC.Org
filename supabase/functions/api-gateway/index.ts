// Supabase Edge Function: Unified API Gateway
// Deploy with: supabase functions deploy api-gateway
// Invoke: POST /functions/v1/api-gateway
//
// Provides a single entry point for all agent actions with:
// - Agent authentication via X-Agent-Key
// - Capability-based access control
// - Optional HMAC command signing verification
// - Action routing to appropriate handlers
// - Audit logging
//
// Issues: #158, #276 (destructive action gate)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { authenticateAgent } from "../_shared/agent-auth.ts";
import {
  canPerformAction,
  resolveRoute,
  ACTION_CAPABILITY_MAP,
} from "../_shared/capabilities.ts";
import { verifySignature } from "../_shared/command-signing.ts";
import { Logger } from "../_shared/logger.ts";
import { validateInput, validateFields } from "../_shared/input-validator.ts";
import { CORS_ORIGIN } from "../_shared/cors.ts";
import {
  isDestructiveAction,
  verifyDestructiveAction,
} from "../_shared/destructive-actions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-key, x-scheduler-secret, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GatewayRequest {
  action: string;
  params?: Record<string, unknown>;
  correlation_id?: string;
}

interface GatewayResponse {
  request_id: string;
  status: "success" | "error";
  data?: unknown;
  error?: string;
  meta: {
    agent_id: string;
    action: string;
    duration_ms: number;
    rate_limit?: {
      remaining: number;
      limit: number;
    };
  };
}

/**
 * Dispatch an action to the appropriate internal handler.
 * Uses the scheduler secret for internal calls to avoid double rate-limiting.
 */
async function dispatchAction(
  action: string,
  params: Record<string, unknown>,
  agentId: string,
  correlationId: string,
  supabase: ReturnType<typeof createClient>,
  logger: Logger,
): Promise<{ status: number; data: unknown }> {
  const route = resolveRoute(action);

  logger.info("Dispatching action", {
    action,
    routeType: route.type,
    handler: route.handler,
  });

  switch (route.type) {
    case "workflow": {
      const workflowId = params.workflow_id as string;
      if (!workflowId) {
        return {
          status: 400,
          data: { error: "workflow_id required for workflow actions" },
        };
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");

      if (!schedulerSecret) {
        logger.error("SCHEDULER_SECRET not configured for internal dispatch");
        return {
          status: 500,
          data: { error: "Internal dispatch configuration error" },
        };
      }

      // Dispatch to workflow-executor using scheduler secret (avoids double rate-limiting)
      const response = await fetch(
        `${supabaseUrl}/functions/v1/workflow-executor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-scheduler-secret": schedulerSecret,
            "x-correlation-id": correlationId,
          },
          body: JSON.stringify({
            workflow_id: workflowId,
            trigger_type: params.trigger_type || "manual",
            trigger_data: {
              ...params,
              source: "api-gateway",
              agent_id: agentId,
            },
          }),
        },
      );

      const data = await response.json();
      return { status: response.status, data };
    }

    case "query": {
      // Direct database query via Supabase client
      const table = action.split(".")[1];
      if (!table) {
        return { status: 400, data: { error: "Invalid query action format" } };
      }

      const { data, error } = await supabase
        .from(table)
        .select((params.select as string) || "*")
        .limit((params.limit as number) || 50);

      if (error) {
        return { status: 500, data: { error: error.message } };
      }

      return { status: 200, data: { rows: data, count: data?.length ?? 0 } };
    }

    case "agent": {
      // Agent-to-agent communication or status checks
      if (action === "agent.status") {
        const { data, error } = await supabase
          .from("agents")
          .select(
            "id, name, type, status, capabilities, health_status, last_seen_at",
          )
          .eq("status", "active");

        if (error) {
          return { status: 500, data: { error: error.message } };
        }
        return { status: 200, data: { agents: data } };
      }

      if (action === "agent.capabilities") {
        const { data, error } = await supabase
          .from("capability_definitions")
          .select("*")
          .order("category, name");

        if (error) {
          return { status: 500, data: { error: error.message } };
        }
        return { status: 200, data: { capabilities: data } };
      }

      return {
        status: 400,
        data: { error: `Unknown agent action: ${action}` },
      };
    }

    case "integration": {
      if (action === "integration.status") {
        const { data, error } = await supabase
          .from("integrations")
          .select("id, service_name, display_name, status, health_checked_at");

        if (error) {
          return { status: 500, data: { error: error.message } };
        }
        return { status: 200, data: { integrations: data } };
      }

      return {
        status: 400,
        data: { error: `Unknown integration action: ${action}` },
      };
    }

    case "system": {
      // Generic system actions dispatched to the appropriate edge function
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");

      if (!schedulerSecret) {
        return {
          status: 500,
          data: { error: "Internal dispatch configuration error" },
        };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/${route.handler}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-scheduler-secret": schedulerSecret,
            "x-correlation-id": correlationId,
          },
          body: JSON.stringify(params),
        },
      );

      const data = await response.json();
      return { status: response.status, data };
    }

    default:
      return { status: 400, data: { error: `Unroutable action: ${action}` } };
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
    // Input validation
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
      action: { required: true, type: "string", minLength: 3 },
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

    const { action, params, correlation_id } = body as GatewayRequest;
    const correlationId = correlation_id || logger.getCorrelationId();

    // Validate action is known
    if (ACTION_CAPABILITY_MAP[action] === undefined) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate agent
    const auth = await authenticateAgent(req, supabase, logger);
    if (!auth.authenticated) {
      const duration = Math.round(performance.now() - start);
      logger.logResponse(auth.status || 401, duration);
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agent = auth.agent!;

    // Capability check
    if (!canPerformAction(agent.capabilities, action)) {
      logger.warn("Agent lacks capability for action", {
        agentId: agent.id,
        action,
        capabilities: agent.capabilities,
      });
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: `Agent lacks capability for action: ${action}`,
          required_capability: ACTION_CAPABILITY_MAP[action],
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Agent type enforcement (#267)
    // - "tool" agents can only perform read-only query actions
    // - "supervised" agents require a pending confirmation for non-read actions
    const agentType = agent.metadata?.agent_type || agent.type || "autonomous";
    const route = resolveRoute(action);

    if (agentType === "tool" && route.type !== "query") {
      logger.warn("Tool agent attempted non-query action", {
        agentId: agent.id,
        action,
        agentType,
      });
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Tool agents can only perform read-only query actions",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (agentType === "supervised" && route.type !== "query") {
      // Check for an approved confirmation for this agent + action
      const { data: confirmation } = await supabase
        .from("agent_confirmations")
        .select("id, status")
        .eq("agent_id", agent.id)
        .eq("action", action)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!confirmation) {
        // Create a pending confirmation request
        await supabase.from("agent_confirmations").insert({
          agent_id: agent.id,
          action,
          params: params || {},
          status: "pending",
          correlation_id: correlationId,
        });

        logger.info("Supervised agent action requires approval", {
          agentId: agent.id,
          action,
        });

        return new Response(
          JSON.stringify({
            error: "Approval required",
            message:
              "This action requires human approval. A confirmation request has been created.",
            confirmation_pending: true,
          }),
          {
            status: 202,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Destructive action gate (#276)
    if (isDestructiveAction(action)) {
      // Load allow_destructive flag from agent record
      const { data: agentRecord } = await supabase
        .from("agents")
        .select("allow_destructive")
        .eq("id", agent.id)
        .single();

      const destructiveCheck = verifyDestructiveAction(action, agentType, {
        allow_destructive: agentRecord?.allow_destructive ?? false,
      });

      if (!destructiveCheck.allowed) {
        logger.warn("Destructive action blocked", {
          agentId: agent.id,
          action,
          reason: destructiveCheck.reason,
        });

        // Audit log the block
        await supabase.rpc("log_audit_event", {
          p_actor_type: "agent",
          p_actor_id: agent.id,
          p_action: `gateway.destructive_blocked`,
          p_resource_type: "api_gateway",
          p_resource_id: correlationId,
          p_details: {
            action,
            reason: destructiveCheck.reason,
          },
        });

        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: destructiveCheck.reason,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Optional HMAC signature verification
    const signatureHeader = req.headers.get("x-signature");
    if (signatureHeader && agent.metadata) {
      // Check if agent has a signing secret configured
      const { data: agentRow } = await supabase
        .from("agents")
        .select("signing_secret_encrypted")
        .eq("id", agent.id)
        .single();

      if (agentRow?.signing_secret_encrypted) {
        const rawBody = JSON.stringify(body);
        const sigResult = await verifySignature(
          signatureHeader,
          rawBody,
          agentRow.signing_secret_encrypted,
        );

        if (!sigResult.valid) {
          logger.warn("HMAC signature verification failed", {
            agentId: agent.id,
            error: sigResult.error,
          });
          return new Response(
            JSON.stringify({
              error: "Signature verification failed",
              message: sigResult.error,
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        logger.info("HMAC signature verified", { agentId: agent.id });
      }
    }

    // Dispatch the action
    const result = await dispatchAction(
      action,
      params || {},
      agent.id,
      correlationId,
      supabase,
      logger,
    );

    const duration = Math.round(performance.now() - start);

    // Audit log
    await supabase.rpc("log_audit_event", {
      p_actor_type: "agent",
      p_actor_id: agent.id,
      p_action: `gateway.${action}`,
      p_resource_type: "api_gateway",
      p_resource_id: correlationId,
      p_details: {
        action,
        status: result.status < 400 ? "success" : "error",
        duration_ms: duration,
      },
    });

    logger.logResponse(result.status, duration);

    const response: GatewayResponse = {
      request_id: correlationId,
      status: result.status < 400 ? "success" : "error",
      data: result.status < 400 ? result.data : undefined,
      error:
        result.status >= 400
          ? (result.data as Record<string, string>)?.error
          : undefined,
      meta: {
        agent_id: agent.id,
        action,
        duration_ms: duration,
        rate_limit: auth.rateLimit
          ? { remaining: auth.rateLimit.remaining, limit: auth.rateLimit.limit }
          : undefined,
      },
    };

    return new Response(JSON.stringify(response), {
      status: result.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...logger.getResponseHeaders(),
      },
    });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error("API gateway error", error as Error);
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
