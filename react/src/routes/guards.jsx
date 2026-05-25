import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { LoadingScreen } from '../components/ui/Spinner';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}

export function RoleRoute({ children, allow }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const roles = user?.roles || [];
  const authorized = roles.some((role) => allow.includes(role));
  if (!authorized) return <Navigate to="/dashboard" replace />;

  return children;
}

/**
 * Permission-based route guard.
 *
 * Props:
 *   permission  - string | string[]   requires ANY of these permissions
 *   permissions - string[]            requires ALL of these permissions
 *   redirectTo  - string              where to redirect when denied (default: /dashboard)
 */
export function PermissionRoute({ children, permission, permissions, redirectTo = '/dashboard' }) {
  const { user, loading } = useAuth();
  const { can, canAny, canAll } = usePermissions();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  let authorized = true;
  if (permissions) {
    authorized = canAll(...(Array.isArray(permissions) ? permissions : [permissions]));
  } else if (permission) {
    authorized = canAny(...(Array.isArray(permission) ? permission : [permission]));
  }

  if (!authorized) return <Navigate to={redirectTo} replace />;

  return children;
}
