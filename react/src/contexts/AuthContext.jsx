import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { disconnectEcho, getEcho } from '../lib/echo';
import { applyAppTheme, applyPublicTheme, resolveThemeForUser } from '../lib/theme';

const AuthContext = createContext(null);

/** Shared post-auth setup */
function applyUserSession(userData) {
  localStorage.setItem('user', JSON.stringify(userData));
  applyAppTheme(resolveThemeForUser(userData));
  if (userData.locale) {
    document.documentElement.lang = userData.locale === 'en' ? 'en' : 'fr';
  }
}

function clearSession() {
  disconnectEcho();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  applyPublicTheme();
  document.documentElement.lang = 'fr';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('token')) {
      return null;
    }
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      clearSession();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/me');
      const userData = data.user || data;

      // Enrich user with resolved permissions from the RBAC endpoint
      try {
        const { data: permData } = await api.get('/me/permissions');
        userData.permissions = permData.permissions ?? [];
      } catch {
        // Fallback: keep whatever permissions came with /me
        userData.permissions = userData.permissions ?? [];
      }

      setUser(userData);
      applyUserSession(userData);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Cross-tab logout detection
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        clearSession();
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Real-time permission change detection via WebSocket
  useEffect(() => {
    if (!user?.id) return;

    let channel;
    try {
      const echo = getEcho();
      channel = echo.private(`user.${user.id}`);
      channel.listen('.permission.changed', () => {
        // Re-fetch user + permissions silently so the UI adapts without full logout
        fetchUser();
      });
    } catch {
      // Echo not available (unauthenticated or not configured)
    }

    return () => {
      if (channel && user?.id) {
        try { getEcho().leave(`user.${user.id}`); } catch { /* ignore */ }
      }
    };
  }, [user?.id, fetchUser]);

  const enrichWithPermissions = async (userData) => {
    try {
      const { data: permData } = await api.get('/me/permissions');
      userData.permissions = permData.permissions ?? [];
    } catch {
      userData.permissions = userData.permissions ?? [];
    }
    return userData;
  };

  const login = async (email, password) => {
    disconnectEcho();
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    const userData = await enrichWithPermissions(data.user);
    setUser(userData);
    applyUserSession(userData);
    return data;
  };

  const register = async (name, email, password, password_confirmation) => {
    disconnectEcho();
    const { data } = await api.post('/auth/register', {
      name, email, password, password_confirmation,
    });
    localStorage.setItem('token', data.token);
    const userData = await enrichWithPermissions(data.user);
    setUser(userData);
    applyUserSession(userData);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
