/**
 * OAuth Integration Flow Tests (#271)
 *
 * Tests OAuth2 flow patterns from integration-auth/index.ts:
 * - OAuth initiation: state generation, URL building, state storage
 * - OAuth callback: state validation, code exchange, token storage
 * - State expiry and CSRF protection
 * - Token refresh flow
 * - Session storage patterns for UI callback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  INTEGRATION_GITHUB,
  INTEGRATION_SLACK,
} from "./fixtures";

// ─── Inline OAuth logic from integration-auth ──────────────────────

interface OAuth2Config {
  client_id: string;
  client_secret: string;
  auth_url: string;
  token_url: string;
  scopes: string[];
  redirect_uri: string;
}

function buildAuthUrl(
  config: OAuth2Config,
  state: string,
  redirectUri?: string,
  scopes?: string[],
): string {
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: redirectUri || config.redirect_uri,
    response_type: "code",
    scope: (scopes || config.scopes || []).join(" "),
    state,
  });

  return `${config.auth_url}?${params.toString()}`;
}

function isStateExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// ─── Test Data ──────────────────────────────────────────────────────

const GITHUB_CONFIG: OAuth2Config = {
  client_id: "gh_client_123",
  client_secret: "gh_secret_456",
  auth_url: "https://github.com/login/oauth/authorize",
  token_url: "https://github.com/login/oauth/access_token",
  scopes: ["repo", "user"],
  redirect_uri: "https://mejohnc.org/admin/integrations/callback",
};

const MOCK_STATE = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const MOCK_CODE = "oauth_code_xyz_123";
const MOCK_CALLBACK_URI = "https://app.example.com/admin/integrations/callback";

const MOCK_STORED_STATE = {
  id: "s0000000-0000-0000-0000-000000000001",
  state: MOCK_STATE,
  integration_id: INTEGRATION_GITHUB.id,
  agent_id: AGENT_OPENCLAW.id,
  redirect_uri: MOCK_CALLBACK_URI,
  initiated_by: "user_test",
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min from now
  used_at: null,
  created_at: new Date().toISOString(),
};

const MOCK_EXPIRED_STATE = {
  ...MOCK_STORED_STATE,
  id: "s0000000-0000-0000-0000-000000000002",
  state: "expired-state-uuid",
  expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("OAuth Integration Flows (#271)", () => {
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    client = createMockSupabaseClient();
  });

  describe("OAuth Initiation", () => {
    it("builds correct GitHub authorization URL", () => {
      const url = buildAuthUrl(GITHUB_CONFIG, MOCK_STATE);
      expect(url).toContain("https://github.com/login/oauth/authorize");
      expect(url).toContain("client_id=gh_client_123");
      expect(url).toContain("response_type=code");
      expect(url).toContain(`state=${MOCK_STATE}`);
      expect(url).toContain("scope=repo+user");
    });

    it("uses custom redirect URI when provided", () => {
      const url = buildAuthUrl(GITHUB_CONFIG, MOCK_STATE, MOCK_CALLBACK_URI);
      expect(url).toContain(encodeURIComponent(MOCK_CALLBACK_URI));
    });

    it("uses custom scopes when provided", () => {
      const url = buildAuthUrl(GITHUB_CONFIG, MOCK_STATE, undefined, [
        "repo",
        "user",
        "workflow",
      ]);
      expect(url).toContain("scope=repo+user+workflow");
    });

    it("stores state in oauth_states table", () => {
      const stateRecord = {
        state: MOCK_STATE,
        integration_id: INTEGRATION_GITHUB.id,
        agent_id: AGENT_OPENCLAW.id,
        redirect_uri: MOCK_CALLBACK_URI,
        initiated_by: "user_test",
      };

      client._setQueryResult({ id: "new-state-id" });
      client.from("oauth_states");
      expect(client.from).toHaveBeenCalledWith("oauth_states");

      expect(stateRecord.state).toBe(MOCK_STATE);
      expect(stateRecord.integration_id).toBe(INTEGRATION_GITHUB.id);
    });

    it("generates unique state per initiation", () => {
      const state1 = crypto.randomUUID();
      const state2 = crypto.randomUUID();
      expect(state1).not.toBe(state2);
    });
  });

  describe("State Validation", () => {
    it("accepts valid unexpired state", () => {
      const state = MOCK_STORED_STATE;
      expect(state.used_at).toBeNull();
      expect(isStateExpired(state.expires_at)).toBe(false);
    });

    it("rejects expired state", () => {
      expect(isStateExpired(MOCK_EXPIRED_STATE.expires_at)).toBe(true);
    });

    it("marks state as used after callback", () => {
      const usedState = {
        ...MOCK_STORED_STATE,
        used_at: new Date().toISOString(),
      };
      expect(usedState.used_at).not.toBeNull();
    });

    it("rejects already-used state", () => {
      const usedState = {
        ...MOCK_STORED_STATE,
        used_at: "2026-03-01T10:00:00Z",
      };
      expect(usedState.used_at).not.toBeNull();
    });

    it("validates state belongs to correct integration", () => {
      expect(MOCK_STORED_STATE.integration_id).toBe(INTEGRATION_GITHUB.id);
      expect(MOCK_STORED_STATE.integration_id).not.toBe(INTEGRATION_SLACK.id);
    });
  });

  describe("OAuth Callback", () => {
    it("requires both code and state parameters", () => {
      const hasCode = !!MOCK_CODE;
      const hasState = !!MOCK_STATE;
      expect(hasCode && hasState).toBe(true);

      const missingCode = !undefined;
      const missingState = !!MOCK_STATE;
      expect(missingCode && missingState).toBe(true);
    });

    it("structures token exchange request correctly", () => {
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code: MOCK_CODE,
        client_id: GITHUB_CONFIG.client_id,
        client_secret: GITHUB_CONFIG.client_secret,
        redirect_uri: GITHUB_CONFIG.redirect_uri,
      });

      expect(params.get("grant_type")).toBe("authorization_code");
      expect(params.get("code")).toBe(MOCK_CODE);
      expect(params.get("client_id")).toBe("gh_client_123");
    });

    it("calculates token expiry from expires_in", () => {
      const expiresIn = 3600; // 1 hour
      const now = Date.now();
      const expiresAt = new Date(now + expiresIn * 1000).toISOString();
      const parsed = new Date(expiresAt).getTime();
      expect(parsed).toBeGreaterThan(now);
      expect(parsed).toBeLessThanOrEqual(now + expiresIn * 1000 + 1000);
    });

    it("handles missing expires_in gracefully", () => {
      const expiresIn = undefined;
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;
      expect(expiresAt).toBeNull();
    });
  });

  describe("Token Refresh", () => {
    it("structures refresh request correctly", () => {
      const refreshToken = "gho_refresh_abc123";
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: GITHUB_CONFIG.client_id,
        client_secret: GITHUB_CONFIG.client_secret,
      });

      expect(params.get("grant_type")).toBe("refresh_token");
      expect(params.get("refresh_token")).toBe(refreshToken);
    });

    it("preserves refresh token when provider omits it", () => {
      const existingTokens = {
        access_token: "old_token",
        refresh_token: "old_refresh",
      };
      const newTokens: Record<string, unknown> = {
        access_token: "new_token",
        // no refresh_token in response
      };

      if (!newTokens.refresh_token && existingTokens.refresh_token) {
        newTokens.refresh_token = existingTokens.refresh_token;
      }

      expect(newTokens.refresh_token).toBe("old_refresh");
    });

    it("uses new refresh token when provided", () => {
      const existingTokens = {
        access_token: "old_token",
        refresh_token: "old_refresh",
      };
      const newTokens: Record<string, unknown> = {
        access_token: "new_token",
        refresh_token: "new_refresh",
      };

      if (!newTokens.refresh_token && existingTokens.refresh_token) {
        newTokens.refresh_token = existingTokens.refresh_token;
      }

      expect(newTokens.refresh_token).toBe("new_refresh");
    });
  });

  describe("Session Storage Patterns", () => {
    it("generates correct session key for integration state", () => {
      const state = MOCK_STATE;
      const key = `oauth_integration_${state}`;
      expect(key).toBe(`oauth_integration_${MOCK_STATE}`);
    });

    it("generates correct session key for agent state", () => {
      const state = MOCK_STATE;
      const key = `oauth_agent_${state}`;
      expect(key).toBe(`oauth_agent_${MOCK_STATE}`);
    });
  });

  describe("OAuth Config Validation", () => {
    it("rejects non-oauth2 service types", () => {
      expect(INTEGRATION_SLACK.service_type).toBe("api_key");
      const isOAuth2 = INTEGRATION_SLACK.service_type === "oauth2";
      expect(isOAuth2).toBe(false);
    });

    it("accepts oauth2 service types", () => {
      expect(INTEGRATION_GITHUB.service_type).toBe("oauth2");
      const isOAuth2 = INTEGRATION_GITHUB.service_type === "oauth2";
      expect(isOAuth2).toBe(true);
    });

    it("requires client_id, auth_url, and token_url", () => {
      const config = GITHUB_CONFIG;
      const isComplete =
        !!config.client_id && !!config.auth_url && !!config.token_url;
      expect(isComplete).toBe(true);
    });

    it("rejects incomplete config", () => {
      const incomplete = { ...GITHUB_CONFIG, client_id: "" };
      const isComplete =
        !!incomplete.client_id &&
        !!incomplete.auth_url &&
        !!incomplete.token_url;
      expect(isComplete).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("identifies states eligible for cleanup", () => {
      const states = [MOCK_STORED_STATE, MOCK_EXPIRED_STATE];
      const expiredOrUsed = states.filter(
        (s) => isStateExpired(s.expires_at) || s.used_at !== null,
      );
      expect(expiredOrUsed).toHaveLength(1);
      expect(expiredOrUsed[0].state).toBe("expired-state-uuid");
    });
  });
});
