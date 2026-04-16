/**
 * Normalise les réponses Laravel (Resource::collection → { data: [...] } ou tableau direct).
 */
export function unwrapCollection(payload, key) {
  if (!payload || typeof payload !== 'object') return [];
  const col = payload[key];
  if (Array.isArray(col)) return col;
  if (col && Array.isArray(col.data)) return col.data;
  return [];
}

export const POLL_INTERVAL_MS = 60_000;
