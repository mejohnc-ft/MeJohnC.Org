/**
 * Role-Based Access Control (RBAC) System
 *
 * Provides fine-grained access control through:
 * - Role definitions with hierarchical permissions
 * - Resource-based permissions
 * - React hooks for permission checking
 * - Route protection utilities
 */

/**
 * Available roles in the system
 */
export type Role =
  | "platform_admin"
  | "admin"
  | "editor"
  | "author"
  | "viewer"
  | "guest";

/**
 * Resources that can be protected
 */
export type Resource =
  | "apps"
  | "projects"
  | "blog_posts"
  | "site_content"
  | "contacts"
  | "bookmarks"
  | "news"
  | "metrics"
  | "tasks"
  | "marketing"
  | "site_builder"
  | "users"
  | "settings"
  | "audit_logs"
  | "platform";

/**
 * Actions that can be performed on resources
 */
export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "publish"
  | "manage";

/**
 * Permission definition
 */
export interface Permission {
  resource: Resource;
  actions: Action[];
}

/**
 * Role definition with permissions
 */
export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  inherits?: Role[]; // Roles to inherit permissions from
}

/**
 * Role hierarchy and permissions
 */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  platform_admin: {
    name: "platform_admin",
    displayName: "Platform Admin",
    description: "Full platform access including tenant management",
    inherits: ["admin"],
    permissions: [
      {
        resource: "platform",
        actions: ["create", "read", "update", "delete", "manage"],
      },
    ],
  },

  admin: {
    name: "admin",
    displayName: "Administrator",
    description: "Full access to all resources and settings",
    permissions: [
      {
        resource: "apps",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "projects",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "blog_posts",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "site_content",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "contacts",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      {
        resource: "bookmarks",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      {
        resource: "news",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      { resource: "metrics", actions: ["read", "manage"] },
      {
        resource: "tasks",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      {
        resource: "marketing",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "site_builder",
        actions: ["create", "read", "update", "delete", "publish", "manage"],
      },
      {
        resource: "users",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      { resource: "settings", actions: ["read", "update", "manage"] },
      { resource: "audit_logs", actions: ["read"] },
    ],
  },

  editor: {
    name: "editor",
    displayName: "Editor",
    description: "Can edit and publish content",
    permissions: [
      { resource: "apps", actions: ["create", "read", "update", "publish"] },
      {
        resource: "projects",
        actions: ["create", "read", "update", "publish"],
      },
      {
        resource: "blog_posts",
        actions: ["create", "read", "update", "publish"],
      },
      { resource: "site_content", actions: ["read", "update", "publish"] },
      { resource: "contacts", actions: ["create", "read", "update"] },
      {
        resource: "bookmarks",
        actions: ["create", "read", "update", "delete"],
      },
      { resource: "news", actions: ["create", "read", "update"] },
      { resource: "metrics", actions: ["read"] },
      { resource: "tasks", actions: ["create", "read", "update"] },
      {
        resource: "marketing",
        actions: ["create", "read", "update", "publish"],
      },
      {
        resource: "site_builder",
        actions: ["create", "read", "update", "publish"],
      },
    ],
  },

  author: {
    name: "author",
    displayName: "Author",
    description: "Can create and edit own content",
    permissions: [
      { resource: "apps", actions: ["create", "read", "update"] },
      { resource: "projects", actions: ["create", "read", "update"] },
      { resource: "blog_posts", actions: ["create", "read", "update"] },
      { resource: "site_content", actions: ["read"] },
      { resource: "contacts", actions: ["read"] },
      { resource: "bookmarks", actions: ["create", "read", "update"] },
      { resource: "news", actions: ["read"] },
      { resource: "tasks", actions: ["create", "read", "update"] },
    ],
  },

  viewer: {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to content",
    permissions: [
      { resource: "apps", actions: ["read"] },
      { resource: "projects", actions: ["read"] },
      { resource: "blog_posts", actions: ["read"] },
      { resource: "site_content", actions: ["read"] },
      { resource: "bookmarks", actions: ["read"] },
      { resource: "news", actions: ["read"] },
      { resource: "metrics", actions: ["read"] },
      { resource: "tasks", actions: ["read"] },
    ],
  },

  guest: {
    name: "guest",
    displayName: "Guest",
    description: "Limited public access",
    permissions: [
      { resource: "apps", actions: ["read"] },
      { resource: "projects", actions: ["read"] },
      { resource: "blog_posts", actions: ["read"] },
      { resource: "site_content", actions: ["read"] },
    ],
  },
};

/**
 * Check if a role has permission for an action on a resource
 */
export function hasPermission(
  role: Role | Role[],
  resource: Resource,
  action: Action,
): boolean {
  const roles = Array.isArray(role) ? role : [role];

  for (const r of roles) {
    const definition = ROLE_DEFINITIONS[r];
    if (!definition) continue;

    const resourcePermission = definition.permissions.find(
      (p) => p.resource === resource,
    );
    if (resourcePermission?.actions.includes(action)) {
      return true;
    }

    // Check inherited roles
    if (definition.inherits) {
      if (hasPermission(definition.inherits, resource, action)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  const definition = ROLE_DEFINITIONS[role];
  if (!definition) return [];

  let permissions = [...definition.permissions];

  // Add inherited permissions
  if (definition.inherits) {
    for (const inheritedRole of definition.inherits) {
      permissions = [...permissions, ...getRolePermissions(inheritedRole)];
    }
  }

  return permissions;
}

/**
 * Check if a role can access a specific admin route
 */
export function canAccessRoute(role: Role | Role[], route: string): boolean {
  const routePermissions: Record<
    string,
    { resource: Resource; action: Action }
  > = {
    "/admin": { resource: "site_content", action: "read" },
    "/admin/apps": { resource: "apps", action: "read" },
    "/admin/projects": { resource: "projects", action: "read" },
    "/admin/blog": { resource: "blog_posts", action: "read" },
    "/admin/contacts": { resource: "contacts", action: "read" },
    "/admin/bookmarks": { resource: "bookmarks", action: "read" },
    "/admin/news": { resource: "news", action: "read" },
    "/admin/metrics": { resource: "metrics", action: "read" },
    "/admin/tasks": { resource: "tasks", action: "read" },
    "/admin/marketing": { resource: "marketing", action: "read" },
    "/admin/site-builder": { resource: "site_builder", action: "read" },
    "/admin/users": { resource: "users", action: "read" },
    "/admin/settings": { resource: "settings", action: "read" },
    "/admin/audit": { resource: "audit_logs", action: "read" },
    "/admin/platform": { resource: "platform", action: "read" },
  };

  // Find matching route (handles nested routes)
  let matchedRoute: string | undefined;
  for (const routePath of Object.keys(routePermissions)) {
    if (route.startsWith(routePath)) {
      if (!matchedRoute || routePath.length > matchedRoute.length) {
        matchedRoute = routePath;
      }
    }
  }

  if (!matchedRoute) {
    // Unknown route - default to allowing authenticated users
    return role !== "guest";
  }

  const { resource, action } = routePermissions[matchedRoute];
  return hasPermission(role, resource, action);
}

/**
 * Map Clerk organization role keys to app roles
 */
const CLERK_ORG_ROLE_MAP: Record<string, Role> = {
  "org:platform_admin": "platform_admin",
  "org:admin": "admin",
  "org:editor": "editor",
  "org:author": "author",
  "org:viewer": "viewer",
  "org:member": "viewer",
};

/**
 * Get user's role from org membership (preferred) or Clerk metadata (fallback)
 *
 * Resolution priority:
 * 1. orgRole (mapped from Clerk org membership) — per-org permissions
 * 2. publicMetadata.role / metadata.role — legacy single-org fallback
 * 3. 'viewer' default for authenticated users
 */
export function getUserRole(
  user: {
    publicMetadata?: { role?: string };
    metadata?: Record<string, unknown>;
    orgRole?: string | null;
  } | null,
): Role {
  if (!user) return "guest";

  // 1. Org membership role (multi-tenant)
  if (user.orgRole) {
    const mapped = CLERK_ORG_ROLE_MAP[user.orgRole];
    if (mapped) return mapped;
  }

  // 2. Legacy metadata role (single-org fallback)
  const metaRole = (user.publicMetadata?.role ?? user.metadata?.role) as
    | Role
    | undefined;
  if (metaRole && ROLE_DEFINITIONS[metaRole]) {
    return metaRole;
  }

  // 3. Default authenticated users to viewer
  return "viewer";
}

/**
 * Permission check result with reason
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check permission with detailed result
 */
export function checkPermission(
  role: Role | Role[],
  resource: Resource,
  action: Action,
): PermissionCheckResult {
  if (hasPermission(role, resource, action)) {
    return { allowed: true };
  }

  const roles = Array.isArray(role) ? role : [role];
  const roleNames = roles
    .map((r) => ROLE_DEFINITIONS[r]?.displayName || r)
    .join(", ");

  return {
    allowed: false,
    reason: `Role "${roleNames}" does not have "${action}" permission on "${resource}"`,
  };
}

/**
 * Create a permission guard function
 */
export function createPermissionGuard(resource: Resource, action: Action) {
  return function guard(role: Role | Role[]): boolean {
    return hasPermission(role, resource, action);
  };
}

// Pre-built permission guards for common checks
export const guards = {
  canManageUsers: createPermissionGuard("users", "manage"),
  canManageSettings: createPermissionGuard("settings", "manage"),
  canPublishContent: createPermissionGuard("blog_posts", "publish"),
  canViewMetrics: createPermissionGuard("metrics", "read"),
  canManageMarketing: createPermissionGuard("marketing", "manage"),
  canEditSiteBuilder: createPermissionGuard("site_builder", "update"),
  canViewAuditLogs: createPermissionGuard("audit_logs", "read"),
};
