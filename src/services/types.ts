/**
 * Service Layer Types
 *
 * Core types and interfaces for the service layer abstraction.
 * Services provide a clean interface between UI components and data access,
 * enabling future extraction of features as standalone products.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TENANT_ID } from "@/lib/schemas";

/**
 * Service mode determines the underlying implementation.
 * - 'supabase': Direct Supabase client access (current)
 * - 'api': REST API access (future, for standalone apps)
 */
export type ServiceMode = "supabase" | "api";

/**
 * Context passed to all service operations.
 * Provides tenant isolation and client configuration.
 */
export interface ServiceContext {
  /** Tenant ID for multi-tenant isolation. Defaults to DEFAULT_TENANT_ID */
  tenantId?: string;
  /** Supabase client instance (for supabase mode) */
  client?: SupabaseClient;
  /** API base URL (for api mode, future use) */
  apiBaseUrl?: string;
}

/**
 * Pagination options for list operations.
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

/**
 * Generic list response with pagination info.
 */
export interface ListResponse<T> {
  /** The items in this page */
  data: T[];
  /** Total count of items (if available) */
  total?: number;
  /** Whether there are more items after this page */
  hasMore?: boolean;
}

/**
 * Base service interface that all services extend.
 */
export interface BaseService {
  /** Unique name identifying this service */
  readonly serviceName: string;
}

/**
 * Helper to get tenant ID from context, with default fallback.
 * @deprecated Use getTenantIdStrict() instead — default fallback bypasses tenant isolation (#297)
 */
export function getTenantId(ctx: ServiceContext): string {
  return ctx.tenantId ?? DEFAULT_TENANT_ID;
}

/**
 * Strict helper to get tenant ID from context.
 * Throws if tenantId is missing — ensures callers always provide explicit tenant context.
 */
export function getTenantIdStrict(ctx: ServiceContext): string {
  if (!ctx.tenantId) {
    throw new Error(
      "tenantId is required but was not provided in ServiceContext",
    );
  }
  return ctx.tenantId;
}
