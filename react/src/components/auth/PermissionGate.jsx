import { usePermissions } from '../../hooks/usePermissions';

/**
 * Conditionally renders children based on permission/role checks.
 *
 * Props:
 *   permission  - string or string[]  → user needs at least one
 *   permissions - string[]            → user needs ALL of them
 *   role        - string or string[]  → user needs at least one of these roles
 *   fallback    - ReactNode           → shown when access is denied (default: null)
 *   negate      - boolean             → inverts the check (show when permission is NOT held)
 *
 * Examples:
 *   <PermissionGate permission="task.edit">
 *     <EditButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission={['task.edit', 'task.delete']}>
 *     <DangerZone />
 *   </PermissionGate>
 *
 *   <PermissionGate permissions={['role.create', 'role.edit']}>
 *     <AdminPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate role="admin" fallback={<p>Réservé aux administrateurs</p>}>
 *     <AdminOnly />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="task.edit" negate>
 *     <ReadOnlyBadge />
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,
  permissions,
  role,
  fallback = null,
  negate = false,
  children,
}) {
  const { can, canAny, canAll, hasRole } = usePermissions();

  let allowed = true;

  if (role) {
    allowed = hasRole(role);
  } else if (permissions) {
    // ALL permissions must be held
    allowed = canAll(...(Array.isArray(permissions) ? permissions : [permissions]));
  } else if (permission) {
    // ANY of the permissions is enough
    allowed = canAny(...(Array.isArray(permission) ? permission : [permission]));
  }

  if (negate) allowed = !allowed;

  return allowed ? children : fallback;
}
