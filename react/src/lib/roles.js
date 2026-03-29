/** Rôles applicatifs (Spatie) — clés API : admin, member, viewer */
export const APP_ROLE_LABELS = {
  admin: 'Administrateur',
  member: 'Membre',
  viewer: 'Invité',
};

const CANONICAL_ROLES = ['admin', 'member', 'viewer'];

/** Map anciens noms ou valeurs inconnues vers un rôle assignable */
export function normalizeAppRole(role) {
  if (!role) return 'member';
  const legacy = { guest: 'viewer', manager: 'member' };
  const resolved = legacy[role] ?? role;
  return CANONICAL_ROLES.includes(resolved) ? resolved : 'member';
}

export function formatAppRole(role) {
  if (!role) return APP_ROLE_LABELS.member;
  const key = normalizeAppRole(role);
  return APP_ROLE_LABELS[key] ?? role;
}

/** Rôle dans un projet (pivot project_user) */
export const PROJECT_ROLE_LABELS = {
  admin: 'Admin projet',
  member: 'Membre',
  guest: 'Invité (lecture seule)',
  viewer: 'Invité', // legacy pivot
};

const LEGACY_PROJECT_ROLES = {
  owner: 'admin',
  manager: 'admin',
  guest: 'guest',
  developer: 'member',
  designer: 'member',
  tester: 'member',
};

/** Affichage d’un rôle projet (y compris anciennes valeurs) */
export function formatProjectRole(role) {
  if (!role) return PROJECT_ROLE_LABELS.member;
  const key = LEGACY_PROJECT_ROLES[role] ?? role;
  const normalized = key === 'viewer' ? 'guest' : key;
  return PROJECT_ROLE_LABELS[normalized] ?? PROJECT_ROLE_LABELS[key] ?? role;
}
