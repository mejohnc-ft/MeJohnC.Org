/**
 * Claude API Client for Supabase Edge Functions
 *
 * Wraps Anthropic Messages API with tool-use support for the agent-executor.
 * Sends requests to the Claude API, parses content blocks (text + tool_use),
 * and returns structured responses.
 *
 * Usage:
 *   import { callClaude, ClaudeTool } from '../_shared/claude-client.ts'
 *
 *   const response = await callClaude({
 *     messages: [{ role: 'user', content: 'Hello' }],
 *     tools: [{ name: 'search', description: '...', input_schema: {...} }],
 *   })
 */

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 4096;

// ─── Types ──────────────────────────────────────────────────────────

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeTextBlock {
  type: "text";
  text: string;
}

export interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ClaudeContentBlock =
  | ClaudeTextBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock;

export interface ClaudeResponse {
  id: string;
  role: "assistant";
  content: ClaudeContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface CallClaudeOptions {
  messages: ClaudeMessage[];
  tools?: ClaudeTool[];
  model?: string;
  max_tokens?: number;
  system?: string;
}

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: unknown,
  ) {
    super(message);
    this.name = "ClaudeApiError";
  }
}

// ─── Client ─────────────────────────────────────────────────────────

/**
 * Call the Claude Messages API.
 *
 * Reads ANTHROPIC_API_KEY from environment. Supports tools[] for tool-use flows.
 * Returns parsed response with content blocks.
 */
export async function callClaude(
  options: CallClaudeOptions,
): Promise<ClaudeResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new ClaudeApiError("ANTHROPIC_API_KEY not configured", 500);
  }

  const body: Record<string, unknown> = {
    model: options.model || DEFAULT_MODEL,
    max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
    messages: options.messages,
  };

  if (options.system) {
    body.system = options.system;
  }

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new ClaudeApiError(
      `Claude API error: ${response.status} ${response.statusText}`,
      response.status,
      errorBody,
    );
  }

  const data = await response.json();
  return data as ClaudeResponse;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Extract all text content from a Claude response.
 */
export function extractText(response: ClaudeResponse): string {
  return response.content
    .filter((block): block is ClaudeTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/**
 * Extract all tool_use blocks from a Claude response.
 */
export function extractToolUses(
  response: ClaudeResponse,
): ClaudeToolUseBlock[] {
  return response.content.filter(
    (block): block is ClaudeToolUseBlock => block.type === "tool_use",
  );
}

/**
 * Check if Claude wants to use tools (stop_reason === 'tool_use').
 */
export function wantsToolUse(response: ClaudeResponse): boolean {
  return response.stop_reason === "tool_use";
}
