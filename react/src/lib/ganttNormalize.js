/**
 * Normalise une tâche API (Laravel ou autre) vers le format attendu par GanttChart.
 * Champs supportés : start / start_date / planned_start, end / end_date / planned_end, name / title.
 */
export function normalizeGanttTask(raw) {
  if (raw == null || typeof raw !== 'object') return null;

  const id = raw.id ?? raw.task_id;
  if (id == null) return null;

  const startRaw = raw.start ?? raw.start_date ?? raw.planned_start ?? null;
  const endRaw = raw.end ?? raw.end_date ?? raw.planned_end ?? null;

  const toDateStr = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'string') return v.slice(0, 10);
    const t = new Date(v);
    if (!Number.isFinite(t.getTime())) return null;
    return t.toISOString().slice(0, 10);
  };

  const start = toDateStr(startRaw);
  const end = toDateStr(endRaw) ?? start;

  const progress = Number(raw.progress ?? raw.progress_percent ?? 0);
  const progressNorm = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;

  const deps = Array.isArray(raw.dependencies) ? raw.dependencies : [];

  return {
    ...raw,
    id,
    name: raw.name ?? raw.title ?? 'Sans titre',
    start,
    end,
    progress: progressNorm,
    progress_percent: progressNorm,
    priority: raw.priority ?? 'medium',
    dependencies: deps.map((d) => (d && typeof d === 'object' ? { id: d.id ?? d.task_id, type: d.type } : d)).filter(Boolean),
  };
}

/** @param {unknown} list */
export function normalizeGanttTasks(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeGanttTask).filter(Boolean);
}
