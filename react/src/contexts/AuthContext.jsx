import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { disconnectEcho } from '../lib/echo';
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

  const login = async (email, password) => {
    disconnectEcho();
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    const userData = data.user;
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
    const userData = data.user;
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
