/**
 * Destructive Action Gate for Agent Safety Layer
 *
 * Identifies and gates actions that have real-world side effects
 * (sending emails, posting to social, processing payments, etc.).
 * Agents must have `allow_destructive` enabled to execute these.
 *
 * Issue: #276
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface DestructiveCheckResult {
  allowed: boolean;
  reason?: string;
}

// ─── Destructive Actions Set ─────────────────────────────────────────

/**
 * Actions that produce irreversible real-world side effects.
 * These require explicit `allow_destructive` flag on the agent.
 */
export const DESTRUCTIVE_ACTIONS = new Set<string>([
  "email.send",
  "social.post",
  "finance.payment",
  "finance.invoice",
  "code.deploy",
  "crm.update_contact",
  "data.export",
]);

/**
 * Check if an action is classified as destructive.
 */
export function isDestructiveAction(action: string): boolean {
  return DESTRUCTIVE_ACTIONS.has(action);
}

// ─── Verification ────────────────────────────────────────────────────

/**
 * Verify whether an agent is permitted to execute a destructive action.
 *
 * Rules:
 * - "tool" agents are always denied destructive actions
 * - Other agents must have `allow_destructive` in their metadata
 * - Supervised agents may use existing confirmation flow instead
 */
export function verifyDestructiveAction(
  action: string,
  agentType: string,
  metadata: Record<string, unknown> = {},
): DestructiveCheckResult {
  if (!isDestructiveAction(action)) {
    return { allowed: true };
  }

  // Tool agents can never perform destructive actions
  if (agentType === "tool") {
    return {
      allowed: false,
      reason: `Tool agents cannot perform destructive action: ${action}`,
    };
  }

  // Check allow_destructive flag
  const allowDestructive = metadata.allow_destructive === true;
  if (!allowDestructive) {
    return {
      allowed: false,
      reason: `Agent does not have allow_destructive permission for: ${action}`,
    };
  }

  return { allowed: true };
}
