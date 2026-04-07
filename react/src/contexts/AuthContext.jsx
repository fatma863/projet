import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { disconnectEcho } from '../lib/echo';
import { applyAppTheme, applyPublicTheme, resolveThemeForUser } from '../lib/theme';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('token')) {
      return null;
    }
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      setUser(null);
      applyPublicTheme();
      document.documentElement.lang = 'fr';
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/me');
      const userData = data.user || data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      applyAppTheme(resolveThemeForUser(userData));
      if (userData.locale) {
        document.documentElement.lang = userData.locale === 'en' ? 'en' : 'fr';
      }
    } catch {
      disconnectEcho();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      applyPublicTheme();
      document.documentElement.lang = 'fr';
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    disconnectEcho();
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    const userData = data.user;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    applyAppTheme(resolveThemeForUser(userData));
    if (userData.locale) {
      document.documentElement.lang = userData.locale === 'en' ? 'en' : 'fr';
    }
    return data;
  };

  const register = async (name, email, password, password_confirmation) => {
    disconnectEcho();
    const { data } = await api.post('/auth/register', {
      name, email, password, password_confirmation,
    });
    localStorage.setItem('token', data.token);
    const userData = data.user;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    applyAppTheme(resolveThemeForUser(userData));
    if (userData.locale) {
      document.documentElement.lang = userData.locale === 'en' ? 'en' : 'fr';
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    disconnectEcho();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    applyPublicTheme();
    document.documentElement.lang = 'fr';
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
