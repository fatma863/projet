/** Rôles applicatifs (Spatie) — clés API : admin, member, client */
export const APP_ROLE_LABELS = {
  admin: 'Administrateur',
  member: 'Membre',
  client: 'Client',
};

const APP_ROLE_LABELS_EN = {
  admin: 'Administrator',
  member: 'Member',
  client: 'Client',
};

const CANONICAL_ROLES = ['admin', 'member', 'client'];

/** Map anciens noms ou valeurs inconnues vers un rôle assignable */
export function normalizeAppRole(role) {
  if (!role) return 'member';
  const legacy = { guest: 'client', viewer: 'client', manager: 'member' };
  const resolved = legacy[role] ?? role;
  return CANONICAL_ROLES.includes(resolved) ? resolved : 'member';
}

/**
 * Profil client (lecture seule) : rôle `client` ou legacy guest/viewer.
 * Les rôles dynamiques (ex: "scrum master") sont traités comme membre.
 */
const CLIENT_ROLES = new Set(['client', 'guest', 'viewer']);

export function isGuestViewer(user) {
  if (!user) return false;
  const list = Array.isArray(user.roles) ? user.roles : [];
  if (list.some((r) => CLIENT_ROLES.has(r))) return true;
  return CLIENT_ROLES.has(user.role);
}

/** @param {'fr'|'en'} [locale] */
export function formatAppRole(role, locale = 'fr') {
  const labels = locale === 'en' ? APP_ROLE_LABELS_EN : APP_ROLE_LABELS;
  if (!role) return labels.member;
  const key = normalizeAppRole(role);
  return labels[key] ?? role;
}

/** Rôles projet : chef (1 par projet), membre, client */
export const PROJECT_ROLE_LABELS = {
  chef:   'Chef de projet',
  membre: 'Membre',
  // legacy — kept for backward compat display only
  admin:  'Chef de projet',
  member: 'Membre',
  client: 'Client',
  guest:  'Client',
  viewer: 'Client',
  owner:  'Chef de projet',
};

/** Retourne le label affiché pour un rôle projet */
export function formatProjectRole(role) {
  if (!role) return PROJECT_ROLE_LABELS.membre;
  return PROJECT_ROLE_LABELS[role] ?? PROJECT_ROLE_LABELS.membre;
}
