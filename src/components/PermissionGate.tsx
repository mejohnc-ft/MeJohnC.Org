/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions
 */

import { ReactNode } from 'react';
import { Resource, Action } from '../lib/rbac';
import { usePermission, useRole, useCanAccessRoute } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** The resource to check permission for */
  resource: Resource;
  /** The action to check permission for */
  action: Action;
  /** Content to render if permission is granted */
  children: ReactNode;
  /** Optional content to render if permission is denied */
  fallback?: ReactNode;
}

/**
 * Renders children only if user has the required permission
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasAccess = usePermission(resource, action);
  return <>{hasAccess ? children : fallback}</>;
}

interface RouteGateProps {
  /** The route to check access for */
  route: string;
  /** Content to render if access is granted */
  children: ReactNode;
  /** Optional content to render if access is denied */
  fallback?: ReactNode;
}

/**
 * Renders children only if user can access the route
 */
export function RouteGate({ route, children, fallback = null }: RouteGateProps) {
  const hasAccess = useCanAccessRoute(route);
  return <>{hasAccess ? children : fallback}</>;
}

interface RoleGateProps {
  /** Required role(s) to access */
  roles: string | string[];
  /** Content to render if role matches */
  children: ReactNode;
  /** Optional content to render if role doesn't match */
  fallback?: ReactNode;
}

/**
 * Renders children only if user has one of the required roles
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const userRole = useRole();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const hasAccess = allowedRoles.includes(userRole);
  return <>{hasAccess ? children : fallback}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only for admin users
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGate roles="admin" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

interface EditorOrAboveProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children for editors and admins
 */
export function EditorOrAbove({ children, fallback = null }: EditorOrAboveProps) {
  return (
    <RoleGate roles={['admin', 'editor']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

interface CanEditProps {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if user can edit the resource
 */
export function CanEdit({ resource, children, fallback = null }: CanEditProps) {
  return (
    <PermissionGate resource={resource} action="update" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

interface CanDeleteProps {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if user can delete the resource
 */
export function CanDelete({ resource, children, fallback = null }: CanDeleteProps) {
  return (
    <PermissionGate resource={resource} action="delete" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

interface CanCreateProps {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if user can create the resource
 */
export function CanCreate({ resource, children, fallback = null }: CanCreateProps) {
  return (
    <PermissionGate resource={resource} action="create" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

interface CanPublishProps {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if user can publish the resource
 */
export function CanPublish({ resource, children, fallback = null }: CanPublishProps) {
  return (
    <PermissionGate resource={resource} action="publish" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
