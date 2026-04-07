/** Rôles applicatifs (Spatie) — clés API : admin, member, viewer */
export const APP_ROLE_LABELS = {
  admin: 'Administrateur',
  member: 'Membre',
  viewer: 'Invité',
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

/** Rôle dans un projet (pivot project_user) */
export const PROJECT_ROLE_LABELS = {
  admin: 'Admin projet',
  member: 'Membre',
  client: 'Client',
  guest: 'Client', // legacy pivot
  viewer: 'Client', // legacy pivot
};

const LEGACY_PROJECT_ROLES = {
  owner: 'admin',
  manager: 'admin',
  guest: 'client',
  viewer: 'client',
  developer: 'member',
  designer: 'member',
  tester: 'member',
};

/** Affichage d’un rôle projet (y compris anciennes valeurs) */
export function formatProjectRole(role) {
  if (!role) return PROJECT_ROLE_LABELS.member;
  const key = LEGACY_PROJECT_ROLES[role] ?? role;
  const normalized = key === 'viewer' || key === 'guest' ? 'client' : key;
  return PROJECT_ROLE_LABELS[normalized] ?? PROJECT_ROLE_LABELS[key] ?? role;
}
