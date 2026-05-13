import { createContext, useContext, useMemo } from ‘react’;
import { translate } from ‘./translate’;

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const locale = ‘fr’;

  const value = useMemo(() => {
    const t = (key, vars) => translate(locale, key, vars);
    return { locale, t };
  }, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
