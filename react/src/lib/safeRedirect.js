/**
 * Chemin interne sûr après connexion / inscription (évite les redirections ouvertes).
 */
export function safeRedirectPath(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}
