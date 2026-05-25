import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Returns helpers to check the current user's permissions.
 *
 * Usage:
 *   const { can, canAny, canAll, hasRole } = usePermissions();
 *   const { can } = usePermissions(projectId);   // scoped to a project
 *
 * Permissions are resolved from:
 *   1. user.permissions (fetched from /me at login time)
 *   2. user.roles (for role-level checks via hasRole)
 *
 * For project-scoped permissions, the frontend uses the global permissions
 * list (resolved by the backend at /me/permissions). For finer project-scoped
 * resolution, call `useProjectPermissions(projectId)` instead.
 */
export function usePermissions(projectId = null) {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    // Support both user.permissions (array of strings) from /me response
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms;
  }, [user]);

  const roles = useMemo(() => {
    if (!user) return [];
    return Array.isArray(user.roles) ? user.roles : [];
  }, [user]);

  const isAdmin = useMemo(() => roles.includes('admin'), [roles]);

  /**
   * Check if the user has a specific permission.
   * Admins always return true.
   */
  const can = (permission) => {
    if (!permission) return true;
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  /**
   * Check if the user has at least one of the given permissions.
   */
  const canAny = (...perms) => {
    if (isAdmin) return true;
    const list = perms.flat();
    return list.some((p) => permissions.includes(p));
  };

  /**
   * Check if the user has ALL of the given permissions.
   */
  const canAll = (...perms) => {
    if (isAdmin) return true;
    const list = perms.flat();
    return list.every((p) => permissions.includes(p));
  };

  /**
   * Check if the user has a specific global role.
   */
  const hasRole = (role) => {
    if (Array.isArray(role)) return role.some((r) => roles.includes(r));
    return roles.includes(role);
  };

  return { can, canAny, canAll, hasRole, isAdmin, permissions, roles };
}

/**
 * Alias for use inside a known project context.
 * The component should pass projectId so that project-scoped permission
 * data fetched separately (via useQuery) can be integrated here.
 */
export function useProjectPermissions(projectPermissions = []) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');

  const can = (permission) => {
    if (!permission) return true;
    if (isAdmin) return true;
    return projectPermissions.includes(permission);
  };

  const canAny = (...perms) => {
    if (isAdmin) return true;
    return perms.flat().some((p) => projectPermissions.includes(p));
  };

  return { can, canAny, isAdmin };
}
