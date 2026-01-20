/**
 * React Hooks for RBAC Permission Checking
 *
 * Provides hooks to check permissions in React components
 */

import { useUser } from '@clerk/clerk-react';
import { useMemo, useCallback } from 'react';
import {
  Role,
  Resource,
  Action,
  hasPermission,
  getUserRole,
  canAccessRoute,
  checkPermission,
  PermissionCheckResult,
  ROLE_DEFINITIONS,
} from '../lib/rbac';

/**
 * Hook to get the current user's role
 */
export function useRole(): Role {
  const { user, isLoaded } = useUser();

  return useMemo(() => {
    if (!isLoaded) return 'guest';
    return getUserRole(user);
  }, [user, isLoaded]);
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(resource: Resource, action: Action): boolean {
  const role = useRole();
  return useMemo(() => hasPermission(role, resource, action), [role, resource, action]);
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(
  checks: Array<{ resource: Resource; action: Action }>
): boolean[] {
  const role = useRole();

  return useMemo(
    () => checks.map(({ resource, action }) => hasPermission(role, resource, action)),
    [role, checks]
  );
}

/**
 * Hook to get a permission checker function
 */
export function usePermissionChecker() {
  const role = useRole();

  return useCallback(
    (resource: Resource, action: Action): PermissionCheckResult => {
      return checkPermission(role, resource, action);
    },
    [role]
  );
}

/**
 * Hook to check if user can access a specific route
 */
export function useCanAccessRoute(route: string): boolean {
  const role = useRole();
  return useMemo(() => canAccessRoute(role, route), [role, route]);
}

/**
 * Hook to get role information
 */
export function useRoleInfo() {
  const role = useRole();

  return useMemo(() => {
    const definition = ROLE_DEFINITIONS[role];
    return {
      role,
      displayName: definition?.displayName || role,
      description: definition?.description || '',
      permissions: definition?.permissions || [],
    };
  }, [role]);
}

/**
 * Hook for checking if user is admin
 */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role === 'admin';
}

/**
 * Hook for checking if user can edit content
 */
export function useCanEdit(resource: Resource): boolean {
  return usePermission(resource, 'update');
}

/**
 * Hook for checking if user can delete content
 */
export function useCanDelete(resource: Resource): boolean {
  return usePermission(resource, 'delete');
}

/**
 * Hook for checking if user can create content
 */
export function useCanCreate(resource: Resource): boolean {
  return usePermission(resource, 'create');
}

/**
 * Hook for checking if user can publish content
 */
export function useCanPublish(resource: Resource): boolean {
  return usePermission(resource, 'publish');
}

/**
 * Hook for checking if user can manage a resource
 */
export function useCanManage(resource: Resource): boolean {
  return usePermission(resource, 'manage');
}

/**
 * Common permission checks bundled together
 */
export function useResourcePermissions(resource: Resource) {
  const role = useRole();

  return useMemo(
    () => ({
      canCreate: hasPermission(role, resource, 'create'),
      canRead: hasPermission(role, resource, 'read'),
      canUpdate: hasPermission(role, resource, 'update'),
      canDelete: hasPermission(role, resource, 'delete'),
      canPublish: hasPermission(role, resource, 'publish'),
      canManage: hasPermission(role, resource, 'manage'),
    }),
    [role, resource]
  );
}
