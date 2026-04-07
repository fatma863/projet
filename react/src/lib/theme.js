/** Thème neutre pour les pages publiques (login, etc.) — indépendant du profil enregistré. */
export const PUBLIC_DEFAULT_THEME = 'light';

/** Réinitialise le thème d’affichage hors session (connexion, landing). */
export function applyPublicTheme() {
  applyAppTheme(PUBLIC_DEFAULT_THEME);
}

/** Applique le thème sur <html> (classe `dark` pour Tailwind). */
export function applyAppTheme(theme) {
  const root = document.documentElement;
  const t = theme || 'light';

  if (t === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (t === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    root.classList.toggle('dark', prefersDark);
    return;
  }

  root.classList.remove('dark');
}

function themeStorageKey(userId) {
  return userId ? `theme:user:${userId}` : 'theme:guest';
}

export function getStoredThemeForUser(userId) {
  try {
    return localStorage.getItem(themeStorageKey(userId));
  } catch {
    return null;
  }
}

export function setStoredThemeForUser(theme, userId) {
  try {
    localStorage.setItem(themeStorageKey(userId), theme);
  } catch {
    // ignore storage failures
  }
}

/**
 * Priority: backend user theme > local storage fallback > light
 */
export function resolveThemeForUser(user) {
  const backend = user?.theme;
  if (backend) return backend;
  return getStoredThemeForUser(user?.id) || 'light';
}
