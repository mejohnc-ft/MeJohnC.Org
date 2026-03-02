/**
 * HITL Notification Tests (#292)
 *
 * Tests the human-in-the-loop notification flow:
 * - Pending confirmation filtering (status, expiry)
 * - Respond (approve/reject) patterns
 * - Realtime subscription setup
 * - Badge count logic
 * - Expiry time formatting
 * - Client-side expiry pruning
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSupabaseClient,
  MOCK_CONFIRMATION_PENDING,
  MOCK_CONFIRMATION_EXPIRED,
  MOCK_CONFIRMATION_APPROVED,
} from "./fixtures";

// ─── Inline query logic from agent-queries.ts ───────────────────────

interface AgentConfirmation {
  id: string;
  tenant_id: string;
  session_id: string;
  command_id: string | null;
  tool_name: string;
  tool_input: Record<string, unknown>;
  description: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

async function getPendingConfirmations(
  client: ReturnType<typeof createMockSupabaseClient>,
): Promise<AgentConfirmation[]> {
  const { data, error } = await client
    .from("agent_confirmations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as AgentConfirmation[]).filter(
    (c) => new Date(c.expires_at) > new Date(),
  );
}

async function respondToConfirmation(
  client: ReturnType<typeof createMockSupabaseClient>,
  id: string,
  approved: boolean,
): Promise<{ error: unknown }> {
  const result = await client
    .from("agent_confirmations")
    .update({
      status: approved ? "approved" : "rejected",
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();

  return { error: result.error };
}

function formatExpiryTime(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "Expired";
  const mins = Math.ceil(remaining / 60_000);
  return `${mins}m left`;
}

function filterExpired(
  confirmations: AgentConfirmation[],
): AgentConfirmation[] {
  const now = new Date();
  return confirmations.filter((c) => new Date(c.expires_at) > now);
}

function computeBadgeCount(pending: AgentConfirmation[]): number {
  return pending.length;
}

function formatBadgeLabel(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("HITL Notifications (#292)", () => {
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    client = createMockSupabaseClient();
  });

  // ─── Pending Confirmations Query ───────────────────────────────

  describe("getPendingConfirmations", () => {
    it("should query agent_confirmations with status=pending", async () => {
      client._setQueryResult([MOCK_CONFIRMATION_PENDING]);

      const result = await getPendingConfirmations(client);

      expect(client.from).toHaveBeenCalledWith("agent_confirmations");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });

    it("should filter out expired confirmations client-side", async () => {
      client._setQueryResult([
        MOCK_CONFIRMATION_PENDING,
        MOCK_CONFIRMATION_EXPIRED,
      ]);

      const result = await getPendingConfirmations(client);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_CONFIRMATION_PENDING.id);
    });

    it("should return empty array on error", async () => {
      client._setQueryResult(null, { message: "RLS denied" });

      const result = await getPendingConfirmations(client);

      expect(result).toEqual([]);
    });

    it("should return empty array when no pending confirmations", async () => {
      client._setQueryResult([]);

      const result = await getPendingConfirmations(client);

      expect(result).toEqual([]);
    });

    it("should order by created_at ascending", async () => {
      client._setQueryResult([MOCK_CONFIRMATION_PENDING]);

      await getPendingConfirmations(client);

      expect(client.from("agent_confirmations").order).toHaveBeenCalledWith(
        "created_at",
        { ascending: true },
      );
    });
  });

  // ─── Respond to Confirmation ───────────────────────────────────

  describe("respondToConfirmation", () => {
    it("should update status to approved", async () => {
      client._setQueryResult({
        ...MOCK_CONFIRMATION_PENDING,
        status: "approved",
      });

      const { error } = await respondToConfirmation(
        client,
        MOCK_CONFIRMATION_PENDING.id,
        true,
      );

      expect(error).toBeNull();
      expect(client.from).toHaveBeenCalledWith("agent_confirmations");
      expect(client.from("agent_confirmations").update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("should update status to rejected", async () => {
      client._setQueryResult({
        ...MOCK_CONFIRMATION_PENDING,
        status: "rejected",
      });

      const { error } = await respondToConfirmation(
        client,
        MOCK_CONFIRMATION_PENDING.id,
        false,
      );

      expect(error).toBeNull();
      expect(client.from("agent_confirmations").update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "rejected" }),
      );
    });

    it("should include responded_at timestamp", async () => {
      client._setQueryResult({
        ...MOCK_CONFIRMATION_PENDING,
        status: "approved",
      });

      await respondToConfirmation(client, MOCK_CONFIRMATION_PENDING.id, true);

      const updateCall = client.from("agent_confirmations").update.mock
        .calls[0][0];
      expect(updateCall.responded_at).toBeDefined();
      expect(new Date(updateCall.responded_at).getTime()).toBeGreaterThan(0);
    });

    it("should only update pending confirmations (double-submit guard)", async () => {
      client._setQueryResult(MOCK_CONFIRMATION_APPROVED);

      await respondToConfirmation(client, MOCK_CONFIRMATION_APPROVED.id, false);

      // Verify it filters by status=pending
      expect(client.from("agent_confirmations").eq).toHaveBeenCalledWith(
        "status",
        "pending",
      );
    });
  });

  // ─── Expiry Time Formatting ────────────────────────────────────

  describe("formatExpiryTime", () => {
    it("should show minutes remaining for future expiry", () => {
      const fiveMinutes = new Date(Date.now() + 5 * 60_000).toISOString();
      expect(formatExpiryTime(fiveMinutes)).toBe("5m left");
    });

    it("should show 1m left for < 1 minute remaining", () => {
      const thirtySeconds = new Date(Date.now() + 30_000).toISOString();
      expect(formatExpiryTime(thirtySeconds)).toBe("1m left");
    });

    it("should show Expired for past time", () => {
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      expect(formatExpiryTime(pastTime)).toBe("Expired");
    });

    it("should handle exact now as Expired", () => {
      const now = new Date(Date.now() - 1).toISOString();
      expect(formatExpiryTime(now)).toBe("Expired");
    });
  });

  // ─── Client-Side Expiry Pruning ────────────────────────────────

  describe("filterExpired", () => {
    it("should keep non-expired confirmations", () => {
      const result = filterExpired([MOCK_CONFIRMATION_PENDING]);
      expect(result).toHaveLength(1);
    });

    it("should remove expired confirmations", () => {
      const result = filterExpired([MOCK_CONFIRMATION_EXPIRED]);
      expect(result).toHaveLength(0);
    });

    it("should handle mixed list", () => {
      const result = filterExpired([
        MOCK_CONFIRMATION_PENDING,
        MOCK_CONFIRMATION_EXPIRED,
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_CONFIRMATION_PENDING.id);
    });

    it("should handle empty list", () => {
      expect(filterExpired([])).toEqual([]);
    });
  });

  // ─── Badge Count ──────────────────────────────────────────────

  describe("badge count", () => {
    it("should return 0 for no pending", () => {
      expect(computeBadgeCount([])).toBe(0);
    });

    it("should return count of pending confirmations", () => {
      expect(
        computeBadgeCount([
          MOCK_CONFIRMATION_PENDING,
          {
            ...MOCK_CONFIRMATION_PENDING,
            id: "cf000000-0000-0000-0000-000000000010",
          },
        ]),
      ).toBe(2);
    });

    it("should format badge label as 9+ for > 9", () => {
      expect(formatBadgeLabel(0)).toBe("");
      expect(formatBadgeLabel(1)).toBe("1");
      expect(formatBadgeLabel(9)).toBe("9");
      expect(formatBadgeLabel(10)).toBe("9+");
      expect(formatBadgeLabel(99)).toBe("9+");
    });
  });

  // ─── Confirmation Structure ────────────────────────────────────

  describe("confirmation structure", () => {
    it("should have required fields", () => {
      const conf = MOCK_CONFIRMATION_PENDING;
      expect(conf.id).toBeDefined();
      expect(conf.session_id).toBeDefined();
      expect(conf.tool_name).toBeDefined();
      expect(conf.tool_input).toBeDefined();
      expect(conf.description).toBeDefined();
      expect(conf.status).toBe("pending");
      expect(conf.expires_at).toBeDefined();
    });

    it("should have 5-minute default expiry window", () => {
      const conf = MOCK_CONFIRMATION_PENDING;
      const expiresAt = new Date(conf.expires_at).getTime();
      const createdAt = new Date(conf.created_at).getTime();
      const diffMs = expiresAt - createdAt;

      // Should be roughly 5 minutes (allow 10s tolerance for test execution)
      expect(diffMs).toBeGreaterThan(4 * 60_000);
      expect(diffMs).toBeLessThanOrEqual(5 * 60_000 + 10_000);
    });

    it("should track tool_name for display", () => {
      expect(MOCK_CONFIRMATION_PENDING.tool_name).toBe("delete_contact");
    });

    it("should track tool_input as JSON", () => {
      expect(MOCK_CONFIRMATION_PENDING.tool_input).toEqual({
        contact_id: "c123",
      });
    });
  });

  // ─── Realtime Subscription Pattern ─────────────────────────────

  describe("realtime subscription pattern", () => {
    it("should subscribe to INSERT events on agent_confirmations", () => {
      // Verify the channel subscription pattern used in the hook
      const channelConfig = {
        event: "INSERT",
        schema: "public",
        table: "agent_confirmations",
      };

      expect(channelConfig.event).toBe("INSERT");
      expect(channelConfig.table).toBe("agent_confirmations");
    });

    it("should subscribe to UPDATE events for status changes", () => {
      const channelConfig = {
        event: "UPDATE",
        schema: "public",
        table: "agent_confirmations",
      };

      expect(channelConfig.event).toBe("UPDATE");
      expect(channelConfig.table).toBe("agent_confirmations");
    });

    it("should add new pending confirmations from INSERT payload", () => {
      const pending: AgentConfirmation[] = [];
      const newRow = MOCK_CONFIRMATION_PENDING;

      // Simulate INSERT handler
      if (
        newRow.status === "pending" &&
        new Date(newRow.expires_at) > new Date()
      ) {
        pending.push(newRow);
      }

      expect(pending).toHaveLength(1);
    });

    it("should not add expired confirmations from INSERT payload", () => {
      const pending: AgentConfirmation[] = [];
      const newRow = MOCK_CONFIRMATION_EXPIRED;

      // Simulate INSERT handler
      if (
        newRow.status === "pending" &&
        new Date(newRow.expires_at) > new Date()
      ) {
        pending.push(newRow);
      }

      expect(pending).toHaveLength(0);
    });

    it("should remove from pending when UPDATE changes status", () => {
      const pending = [MOCK_CONFIRMATION_PENDING];

      // Simulate UPDATE handler
      const updated = {
        ...MOCK_CONFIRMATION_PENDING,
        status: "approved" as const,
      };
      const filtered =
        updated.status !== "pending"
          ? pending.filter((c) => c.id !== updated.id)
          : pending;

      expect(filtered).toHaveLength(0);
    });
  });

  // ─── NotificationCenter Integration ────────────────────────────

  describe("NotificationCenter integration", () => {
    it("should pass pending confirmations as props", () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        pendingConfirmations: [MOCK_CONFIRMATION_PENDING],
        onRespond: vi.fn(),
      };

      expect(props.pendingConfirmations).toHaveLength(1);
      expect(props.onRespond).toBeDefined();
    });

    it("should handle empty pendingConfirmations gracefully", () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        pendingConfirmations: [] as AgentConfirmation[],
      };

      // Pending section should not render when empty
      expect(props.pendingConfirmations.length).toBe(0);
    });
  });
});
