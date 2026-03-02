/**
 * Content Filter Module for Agent Safety Layer
 *
 * Pure functions for PII redaction, prompt injection detection,
 * tool output filtering, and response sanitization.
 * No external dependencies — sub-millisecond per call.
 *
 * Issue: #276
 */

// ─── Types ───────────────────────────────────────────────────────────

export type Severity = "warn" | "block";

export interface Violation {
  type: string;
  severity: Severity;
  detail: string;
}

export interface FilterResult {
  passed: boolean;
  filtered: string;
  violations: Violation[];
}

export interface FilterConfig {
  maxLength?: number;
  blockPatterns?: RegExp[];
  redactPii?: boolean;
}

// ─── PII Redaction ───────────────────────────────────────────────────

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    // Email addresses
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    // US phone numbers (various formats)
    pattern: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
  {
    // SSN (XXX-XX-XXXX)
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[REDACTED_SSN]",
  },
  {
    // Credit card numbers (13-19 digits, optionally separated)
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: "[REDACTED_CC]",
  },
  {
    // API keys (common patterns: sk-, pk_, key-, token_, Bearer)
    pattern: /\b(?:sk[-_]|pk[-_]|key[-_]|token[-_])[a-zA-Z0-9_-]{16,}\b/g,
    replacement: "[REDACTED_KEY]",
  },
];

/**
 * Redact PII patterns from content.
 * Returns the redacted string.
 */
export function redactPii(content: string): string {
  let result = content;
  for (const { pattern, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Prompt Injection Detection ──────────────────────────────────────

const INJECTION_PATTERNS: Array<{
  pattern: RegExp;
  severity: Severity;
  type: string;
}> = [
  {
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    severity: "block",
    type: "instruction_override",
  },
  {
    pattern: /ignore\s+(all\s+)?above\s+instructions/i,
    severity: "block",
    type: "instruction_override",
  },
  {
    pattern: /disregard\s+(all\s+)?previous/i,
    severity: "block",
    type: "instruction_override",
  },
  {
    pattern: /you\s+are\s+now\s+(?:a|an)\s+/i,
    severity: "block",
    type: "role_hijack",
  },
  {
    pattern: /new\s+instructions?\s*:/i,
    severity: "block",
    type: "instruction_override",
  },
  {
    pattern: /system\s*:\s*/i,
    severity: "warn",
    type: "system_prompt_injection",
  },
  {
    pattern: /<\s*system\s*>/i,
    severity: "block",
    type: "xml_injection",
  },
  {
    pattern: /<\s*\/\s*system\s*>/i,
    severity: "block",
    type: "xml_injection",
  },
  {
    pattern: /\[INST\]/i,
    severity: "block",
    type: "delimiter_injection",
  },
  {
    pattern: /<<\s*SYS\s*>>/i,
    severity: "block",
    type: "delimiter_injection",
  },
  {
    pattern: /reveal\s+(your\s+)?system\s+prompt/i,
    severity: "warn",
    type: "prompt_extraction",
  },
  {
    pattern: /print\s+(your\s+)?(system\s+)?instructions/i,
    severity: "warn",
    type: "prompt_extraction",
  },
  {
    pattern: /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
    severity: "warn",
    type: "prompt_extraction",
  },
];

/**
 * Detect prompt injection attempts in content.
 * Returns an array of violations found.
 */
export function detectPromptInjection(content: string): Violation[] {
  const violations: Violation[] = [];

  for (const { pattern, severity, type } of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      violations.push({
        type,
        severity,
        detail: `Matched pattern: "${match[0]}"`,
      });
    }
  }

  return violations;
}

// ─── Tool Output Filtering ───────────────────────────────────────────

const BLOCKED_OUTPUT_PATTERNS: RegExp[] = [
  // Internal/private IP addresses
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
  // Environment variable patterns (e.g., DATABASE_URL=...)
  /\b[A-Z_]{4,}=\S+/g,
  // Connection strings
  /(?:postgres|mysql|mongodb|redis):\/\/\S+/gi,
];

const DEFAULT_MAX_OUTPUT_LENGTH = 50_000;

/**
 * Filter tool output: redact PII, check blocked patterns, enforce length.
 */
export function filterToolOutput(
  content: string,
  config: FilterConfig = {},
): FilterResult {
  const violations: Violation[] = [];
  const maxLength = config.maxLength ?? DEFAULT_MAX_OUTPUT_LENGTH;
  const shouldRedactPii = config.redactPii ?? true;

  let filtered = content;

  // PII redaction
  if (shouldRedactPii) {
    filtered = redactPii(filtered);
  }

  // Blocked patterns
  const patterns = config.blockPatterns ?? BLOCKED_OUTPUT_PATTERNS;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(filtered)) {
      violations.push({
        type: "blocked_pattern",
        severity: "warn",
        detail: `Content matched blocked output pattern`,
      });
      // Redact matches
      pattern.lastIndex = 0;
      filtered = filtered.replace(pattern, "[REDACTED]");
    }
  }

  // Length truncation
  if (filtered.length > maxLength) {
    filtered = filtered.substring(0, maxLength) + "\n[TRUNCATED]";
    violations.push({
      type: "length_exceeded",
      severity: "warn",
      detail: `Output truncated from ${content.length} to ${maxLength} chars`,
    });
  }

  return {
    passed: violations.length === 0,
    filtered,
    violations,
  };
}

// ─── Response Filtering ──────────────────────────────────────────────

const SYSTEM_PROMPT_LEAK_PATTERNS: RegExp[] = [
  /my\s+system\s+prompt\s+(?:is|says|reads)/i,
  /here\s+(?:is|are)\s+my\s+(?:system\s+)?instructions/i,
  /I\s+was\s+instructed\s+to\s+(?:never|always|not)\b/i,
  /my\s+instructions\s+(?:say|tell|state)\b/i,
];

/**
 * Filter Claude's final response: redact PII, detect system prompt leakage.
 */
export function filterResponse(
  content: string,
  config: FilterConfig = {},
): FilterResult {
  const violations: Violation[] = [];
  const shouldRedactPii = config.redactPii ?? true;

  let filtered = content;

  // PII redaction
  if (shouldRedactPii) {
    filtered = redactPii(filtered);
  }

  // System prompt leakage detection
  for (const pattern of SYSTEM_PROMPT_LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(filtered)) {
      violations.push({
        type: "system_prompt_leak",
        severity: "warn",
        detail: "Response may contain system prompt leakage",
      });
      break;
    }
  }

  return {
    passed: violations.length === 0,
    filtered,
    violations,
  };
}

// ─── Tool Output Wrapping ────────────────────────────────────────────

/**
 * Wrap tool output with boundary markers so Claude treats results as data.
 */
export function wrapToolOutput(toolName: string, content: string): string {
  return `[TOOL_RESULT: ${toolName}]\n${content}\n[/TOOL_RESULT]`;
}
