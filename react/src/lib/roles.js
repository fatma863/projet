/** Rôles applicatifs (Spatie) — clés API : admin, member, viewer */
export const APP_ROLE_LABELS = {
  admin: 'Administrateur',
  member: 'Membre',
  viewer: 'Client',
};

const APP_ROLE_LABELS_EN = {
  admin: 'Administrator',
  member: 'Member',
  viewer: 'Guest',
};

const CANONICAL_ROLES = ['admin', 'member', 'viewer'];

/** Map anciens noms ou valeurs inconnues vers un rôle assignable */
export function normalizeAppRole(role) {
  if (!role) return 'member';
  const legacy = { guest: 'viewer', manager: 'member' };
  const resolved = legacy[role] ?? role;
  return CANONICAL_ROLES.includes(resolved) ? resolved : 'member';
}

/**
 * Profil invité (lecture seule) : rôle applicatif `viewer` (Spatie), y compris `guest` legacy.
 */
export function isGuestViewer(user) {
  if (!user) return false;
  const list = Array.isArray(user.roles) ? user.roles : [];
  if (list.some((r) => normalizeAppRole(r) === 'viewer')) return true;
  return normalizeAppRole(user.role) === 'viewer';
}

/** @param {'fr'|'en'} [locale] */
export function formatAppRole(role, locale = 'fr') {
  const labels = locale === 'en' ? APP_ROLE_LABELS_EN : APP_ROLE_LABELS;
  if (!role) return labels.member;
  const key = normalizeAppRole(role);
  return labels[key] ?? role;
}

/** Rôles projet simplifiés : chef (1 par projet), membre et client */
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
