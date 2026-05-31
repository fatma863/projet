import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { translate } from './translate';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const { user } = useAuth();
  const locale = user?.locale === 'en' ? 'en' : 'fr';

  const value = useMemo(() => {
    const t = (key, vars) => translate(locale, key, vars);
    return { locale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
