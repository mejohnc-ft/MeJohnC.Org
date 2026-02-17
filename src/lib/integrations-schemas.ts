import { z } from 'zod';

// ============================================
// INTEGRATION SCHEMAS
// ============================================

// Integration service types
export const IntegrationServiceTypeSchema = z.enum(['oauth2', 'api_key', 'webhook', 'custom']);
export type IntegrationServiceType = z.infer<typeof IntegrationServiceTypeSchema>;

// Integration status types
export const IntegrationStatusSchema = z.enum(['active', 'inactive', 'error']);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

// Integration Schema
export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  service_name: z.string(),
  service_type: IntegrationServiceTypeSchema,
  display_name: z.string(),
  description: z.string().nullable(),
  icon_url: z.string().nullable(),
  config: z.record(z.unknown()).nullable(),
  status: IntegrationStatusSchema,
  health_check_url: z.string().nullable(),
  health_checked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// Integration Credential Types
export const CredentialTypeSchema = z.enum(['oauth_token', 'api_key', 'webhook_secret', 'custom']);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

// Integration Credential Schema (metadata only - encrypted_data not included)
export const IntegrationCredentialSchema = z.object({
  id: z.string().uuid(),
  integration_id: z.string().uuid(),
  agent_id: z.string().uuid().nullable(),
  credential_type: CredentialTypeSchema,
  encryption_key_id: z.string().uuid().nullable(),
  expires_at: z.string().nullable(),
  last_used_at: z.string().nullable(),
  created_at: z.string(),
});
export type IntegrationCredential = z.infer<typeof IntegrationCredentialSchema>;

// Agent Integration Access Schema
export const AgentIntegrationSchema = z.object({
  agent_id: z.string().uuid(),
  integration_id: z.string().uuid(),
  granted_scopes: z.array(z.string()).nullable().transform(v => v ?? []),
  granted_at: z.string(),
  granted_by: z.string().nullable(),
});
export type AgentIntegration = z.infer<typeof AgentIntegrationSchema>;

// Integration with agent count (for list view)
export const IntegrationWithCountSchema = IntegrationSchema.extend({
  agent_count: z.number().default(0),
});
export type IntegrationWithCount = z.infer<typeof IntegrationWithCountSchema>;

// Agent with access details (for integration detail view)
export const AgentAccessDetailSchema = z.object({
  agent_id: z.string().uuid(),
  agent_name: z.string(),
  scopes: z.array(z.string()),
  granted_at: z.string(),
  granted_by: z.string().nullable(),
});
export type AgentAccessDetail = z.infer<typeof AgentAccessDetailSchema>;
