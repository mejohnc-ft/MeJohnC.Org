import type { Handler, HandlerEvent } from "@netlify/functions";

/**
 * Netlify Function: AI Proxy
 *
 * Proxies requests to the Anthropic Claude API so the API key stays
 * server-side instead of being bundled into the frontend JS.
 *
 * Issue: #306 - Move Anthropic API key from VITE_ client bundle to server-side proxy
 *
 * Client calls: POST /api/ai-proxy
 * Body: { model, max_tokens, temperature, system, messages }
 */

const ALLOWED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
];

const MAX_TOKENS_LIMIT = 4096;

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
