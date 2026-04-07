const UNITS = [
  { s: 60, label: 'seconde', plural: 'secondes' },
  { s: 60, label: 'minute', plural: 'minutes' },
  { s: 24, label: 'heure', plural: 'heures' },
  { s: 7, label: 'jour', plural: 'jours' },
  { s: 4.345, label: 'semaine', plural: 'semaines' },
  { s: 12, label: 'mois', plural: 'mois' },
  { s: Infinity, label: 'an', plural: 'ans' },
];

/**
 * @param {string | Date} input
 * @param {string} [locale]
 */
export function formatRelativeTimeFr(input, locale = 'fr-FR') {
  if (!input) return '';
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return '';
  let diffSec = Math.round((then - Date.now()) / 1000);
  const future = diffSec > 0;
  const abs = Math.abs(diffSec);

  if (abs < 45) {
    return future ? 'dans quelques secondes' : 'à l’instant';
  }

  let value = abs;
  let i = 0;
  for (; i < UNITS.length; i += 1) {
    const u = UNITS[i];
    if (value < u.s) break;
    value /= u.s;
  }
  const n = Math.max(1, Math.floor(value));
  const unit = UNITS[Math.min(i, UNITS.length - 1)];
  const word = n === 1 ? unit.label : unit.plural;

  if (future) {
    return `dans ${n} ${word}`;
  }
  return `il y a ${n} ${word}`;
}

export function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function notificationDateBucket(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'older';
  const today = startOfLocalDay();
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const t = startOfLocalDay(d).getTime();
  if (t === today.getTime()) return 'today';
  if (t === y.getTime()) return 'yesterday';
  if (d >= weekAgo) return 'week';
  return 'older';
}

export const NOTIFICATION_BUCKET_LABELS = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  week: 'Cette semaine',
  older: 'Plus tôt',
};

const NOTIFICATION_BUCKET_ORDER = ['today', 'yesterday', 'week', 'older'];

/** @param {Array<{ created_at?: string }>} notifications */
export function groupNotificationsByDate(notifications) {
  const groups = { today: [], yesterday: [], week: [], older: [] };
  (notifications || []).forEach((n) => {
    const b = notificationDateBucket(n.created_at);
    groups[b].push(n);
  });
  return NOTIFICATION_BUCKET_ORDER.map((key) => ({
    key,
    label: NOTIFICATION_BUCKET_LABELS[key],
    items: groups[key],
  })).filter((g) => g.items.length > 0);
}
