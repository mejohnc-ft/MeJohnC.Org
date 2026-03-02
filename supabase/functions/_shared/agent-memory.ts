/**
 * Agent Memory Module (pgvector)
 *
 * Provides semantic memory retrieval and storage for agents.
 * Uses OpenAI text-embedding-3-small (1536 dims) for embeddings
 * and pgvector for similarity search.
 *
 * All functions gracefully degrade (return empty/null) if OPENAI_API_KEY
 * is missing or the API fails, so memory is never a hard dependency.
 *
 * Issue: #269
 */

import { Logger } from "./logger.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentMemory {
  id: string;
  summary: string;
  command_text: string | null;
  response_text: string | null;
  tool_names: string[];
  importance: number;
  similarity: number;
  created_at: string;
}

export interface StoreMemoryOptions {
  agentId: string;
  sessionId?: string;
  commandId?: string;
  command: string;
  response: string;
  toolNames?: string[];
  turnCount?: number;
  importance?: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_TIMEOUT_MS = 3000;
const MAX_SUMMARY_LENGTH = 2000;
const MAX_STORED_TEXT_LENGTH = 1000;
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_THRESHOLD = 0.7;

// ─── Embedding Generation ────────────────────────────────────────────

/**
 * Generate a 1536-dim embedding via OpenAI text-embedding-3-small.
 * Returns null if OPENAI_API_KEY is not set or the call fails.
 */
export async function generateEmbedding(
  text: string,
  logger?: Logger,
): Promise<number[] | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    logger?.warn("OPENAI_API_KEY not set — skipping embedding generation");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.substring(0, 8000), // API input limit safety
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger?.warn("OpenAI embedding API error", {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (error) {
    logger?.warn("Embedding generation failed", {
      error: (error as Error).message,
    });
    return null;
  }
}

// ─── Summary Building ────────────────────────────────────────────────

/**
 * Build a summary from command + response for embedding.
 * Simple concatenation — no extra Claude call to stay within budget.
 */
export function buildSummary(command: string, response: string): string {
  const summary = `Command: ${command}\nResponse: ${response}`;
  return summary.substring(0, MAX_SUMMARY_LENGTH);
}

// ─── Memory Retrieval ────────────────────────────────────────────────

/**
 * Retrieve semantically similar past memories for an agent.
 * Returns empty array if embedding fails or no memories match.
 */
export async function retrieveMemories(
  agentId: string,
  command: string,
  supabase: {
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  },
  logger?: Logger,
): Promise<AgentMemory[]> {
  const embedding = await generateEmbedding(command, logger);
  if (!embedding) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("match_agent_memories", {
      p_agent_id: agentId,
      p_embedding: JSON.stringify(embedding),
      p_match_count: DEFAULT_MATCH_COUNT,
      p_threshold: DEFAULT_THRESHOLD,
    });

    if (error) {
      logger?.warn("Memory retrieval failed", { error });
      return [];
    }

    const memories = (data as AgentMemory[]) || [];

    // Touch memories to track access (fire-and-forget)
    if (memories.length > 0) {
      const ids = memories.map((m) => m.id);
      supabase.rpc("touch_agent_memories", { p_ids: ids }).catch(() => {});
    }

    return memories;
  } catch (error) {
    logger?.warn("Memory retrieval error", {
      error: (error as Error).message,
    });
    return [];
  }
}

// ─── Memory Storage ──────────────────────────────────────────────────

/**
 * Store a memory with embedding for future retrieval.
 * Returns true if stored successfully, false otherwise.
 */
export async function storeMemory(
  opts: StoreMemoryOptions,
  supabase: {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  },
  logger?: Logger,
): Promise<boolean> {
  const summary = buildSummary(opts.command, opts.response);
  const embedding = await generateEmbedding(summary, logger);

  if (!embedding) {
    return false;
  }

  try {
    const { error } = await supabase.from("agent_memories").insert({
      agent_id: opts.agentId,
      session_id: opts.sessionId || null,
      command_id: opts.commandId || null,
      summary,
      embedding: JSON.stringify(embedding),
      command_text: opts.command.substring(0, MAX_STORED_TEXT_LENGTH),
      response_text: opts.response.substring(0, MAX_STORED_TEXT_LENGTH),
      tool_names: opts.toolNames || [],
      turn_count: opts.turnCount || 0,
      importance: opts.importance || 1.0,
    });

    if (error) {
      logger?.warn("Memory storage failed", { error });
      return false;
    }

    return true;
  } catch (error) {
    logger?.warn("Memory storage error", {
      error: (error as Error).message,
    });
    return false;
  }
}

// ─── Prompt Formatting ───────────────────────────────────────────────

/**
 * Format retrieved memories as a markdown section for the system prompt.
 * Returns empty string if no memories.
 */
export function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) {
    return "";
  }

  const lines = memories.map((m, i) => {
    const date = new Date(m.created_at).toISOString().split("T")[0];
    const tools =
      m.tool_names.length > 0 ? ` (tools: ${m.tool_names.join(", ")})` : "";
    return `${i + 1}. [${date}]${tools} ${m.summary}`;
  });

  return ["", "RELEVANT PAST INTERACTIONS:", ...lines, ""].join("\n");
}
