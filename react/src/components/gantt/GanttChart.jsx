import { useMemo, useCallback, useId } from 'react';
import { cn } from '../../lib/utils';

/** Couleurs de base → dégradés (look pro, lisible en clair/sombre) */
const PRIORITY_STYLES = {
  low: {
    bar: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #1d4ed8 100%)',
    glow: 'rgba(37, 99, 235, 0.35)',
  },
  medium: {
    bar: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  high: {
    bar: 'linear-gradient(135deg, #fb923c 0%, #ea580c 52%, #c2410c 100%)',
    glow: 'rgba(234, 88, 12, 0.35)',
  },
  urgent: {
    bar: 'linear-gradient(135deg, #f87171 0%, #ef4444 48%, #b91c1c 100%)',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

const CRITICAL_BAR =
  'linear-gradient(135deg, #fca5a5 0%, #dc2626 45%, #991b1b 100%)';
const DELAYED_OVERLAY = 'linear-gradient(90deg, rgba(251,191,36,0.25) 0%, transparent 100%)';

function getBarBackground(task) {
  if (task.is_critical) return { gradient: CRITICAL_BAR, glow: 'rgba(220, 38, 38, 0.45)' };
  const p = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  if (task.is_delayed) {
    return {
      gradient: p.bar,
      overlay: DELAYED_OVERLAY,
      glow: p.glow,
    };
  }
  return { gradient: p.bar, glow: p.glow };
}

/**
 * @param {object} props
 * @param {Array} props.tasks
 * @param {boolean} [props.showProject]
 * @param {'default' | 'compact'} [props.variant]
 * @param {string} [props.rowLabel] — header label for the name column (default "Tâche")
 */
function safeNum(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export function GanttChart({ tasks = [], showProject = false, variant = 'default', rowLabel = 'Tâche' }) {
  let list = [];
  try {
    list = Array.isArray(tasks) ? tasks : [];
  } catch {
    list = [];
  }

  const depId = useId().replace(/:/g, '');
  const arrowNorm = `gantt-arrow-${depId}`;
  const arrowCrit = `gantt-arrow-crit-${depId}`;

  const labelWidthClass = variant === 'compact' ? 'w-56 min-w-[14rem]' : showProject ? 'w-72 min-w-[18rem]' : 'w-64 min-w-[16rem]';
  const svgLeftClass = variant === 'compact' ? 'left-56' : showProject ? 'left-72' : 'left-64';
  const labelRem = variant === 'compact' ? 14 : showProject ? 18 : 16;

  const { minDate, totalDays, months, todayPercent } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    const parseTs = (iso) => {
      if (!iso) return null;
      const x = new Date(iso).getTime();
      return Number.isFinite(x) ? x : null;
    };
    list.forEach((t) => {
      const ts = parseTs(t.start);
      const te = parseTs(t.end);
      if (ts != null) min = Math.min(min, ts);
      if (te != null) max = Math.max(max, te);
    });
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === Infinity || max === -Infinity) {
      const now = Date.now();
      const day = 86400000;
      min = now - 7 * day;
      max = now + 30 * day;
    }
    const pad = 2 * 86400000;
    min -= pad;
    max += pad;
    const totalDaysCalc = Math.max(1, Math.ceil((max - min) / 86400000));
    const minD = new Date(min);
    const maxD = new Date(max);

    const monthsArr = [];
    let cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const maxDTime = maxD.getTime();
    while (cursor.getTime() <= maxDTime) {
      const offset = Math.max(0, (cursor.getTime() - min) / 86400000);
      monthsArr.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        offset,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const now = Date.now();
    let todayPct = null;
    if (now >= min && now <= max && totalDaysCalc > 0) {
      const p = ((now - min) / 86400000 / totalDaysCalc) * 100;
      todayPct = Number.isFinite(p) ? p : null;
    }

    return {
      minDate: min,
      totalDays: totalDaysCalc,
      months: monthsArr,
      todayPercent: todayPct,
    };
  }, [list]);

  const taskRows = useMemo(
    () => list.map((task, index) => ({ ...task, rowIndex: index })),
    [list],
  );

  const byId = useMemo(() => {
    const map = new Map();
    taskRows.forEach((t) => {
      if (t.id == null) return;
      map.set(t.id, t);
      map.set(String(t.id), t);
      map.set(Number(t.id), t);
    });
    return map;
  }, [taskRows]);

  const getBarMetrics = useCallback(
    (task) => {
      if (!task.start || !task.end) return null;
      const ts = new Date(task.start).getTime();
      const te = new Date(task.end).getTime();
      if (!Number.isFinite(ts) || !Number.isFinite(te) || te < ts) return null;
      const startOffset = (ts - minDate) / 86400000;
      const duration = Math.max(1, (te - ts) / 86400000 + 1);
      const left = safeNum((startOffset / totalDays) * 100);
      const width = safeNum((duration / totalDays) * 100);
      return { left, width };
    },
    [minDate, totalDays],
  );

  const rowHeight = 44;
  const chartHeight = Math.max(taskRows.length * rowHeight, 1);

  const dependencies = useMemo(() => {
    const lines = [];
    taskRows.forEach((task) => {
      const to = getBarMetrics(task);
      const deps = task.dependencies;
      if (!to || !Array.isArray(deps) || deps.length === 0) return;
      deps.forEach((dep) => {
        if (!dep || dep.id == null) return;
        const fromTask =
          byId.get(dep.id) ?? byId.get(String(dep.id)) ?? byId.get(Number(dep.id));
        const from = fromTask ? getBarMetrics(fromTask) : null;
        if (!from || !fromTask) return;
        const y1 = fromTask.rowIndex * rowHeight + rowHeight / 2;
        const y2 = task.rowIndex * rowHeight + rowHeight / 2;
        const x1 = safeNum(from.left + from.width);
        const x2 = safeNum(to.left);
        const midX = safeNum((x1 + x2) / 2);
        if (![x1, x2, y1, y2, midX].every((v) => Number.isFinite(v))) return;
        lines.push({
          key: `${dep.id}-${task.id}-${dep.type || 'dep'}`,
          x1,
          x2,
          y1,
          y2,
          midX,
          critical: task.is_critical && fromTask.is_critical,
        });
      });
    });
    return lines;
  }, [taskRows, byId, getBarMetrics, rowHeight]);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center text-sm text-muted-foreground">
        Aucune tâche avec dates planifiées
      </div>
    );
  }

  const weekStripeCount = Math.max(1, Math.ceil(totalDays / 7));

  try {
  return (
    <div
      className={cn(
        'group/gantt overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl shadow-slate-900/5',
        'ring-1 ring-black/[0.04] dark:ring-white/[0.06] dark:shadow-black/40',
      )}
    >
      {/* Timeline header */}
      <div className="relative z-30 flex border-b border-border/80 bg-gradient-to-b from-muted/80 to-muted/40 backdrop-blur-md dark:from-slate-800/90 dark:to-slate-900/60">
        <div
          className={cn(
            'flex shrink-0 flex-col justify-center border-r border-border/60 bg-card/90 px-4 py-3 backdrop-blur-sm dark:bg-slate-900/90',
            labelWidthClass,
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{rowLabel}</span>
        </div>
        <div className="relative min-h-[52px] min-w-[400px] flex-1">
          <div
            className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-35"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / ${weekStripeCount} - 1px), rgba(148,163,184,0.35) calc(100% / ${weekStripeCount} - 1px), rgba(148,163,184,0.35) calc(100% / ${weekStripeCount}))`,
            }}
          />
          {months.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 border-l border-border/50 pl-2.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:border-l-0 first:pl-3"
              style={{ left: `${safeNum((m.offset / totalDays) * 100)}%` }}
            >
              {m.label}
            </div>
          ))}
          {todayPercent != null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-gradient-to-b from-emerald-500/90 via-emerald-400 to-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
              style={{ left: `${todayPercent}%` }}
              title="Aujourd’hui"
            />
          )}
          {todayPercent != null && (
            <div
              className="pointer-events-none absolute -top-0.5 z-20 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md"
              style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }}
            >
              Aujourd’hui
            </div>
          )}
        </div>
      </div>

      {/* Corps + grille */}
      <div className="relative overflow-x-auto">
        <div className="relative min-w-[720px]">
          <svg
            className={cn('pointer-events-none absolute right-0 top-0 z-10', svgLeftClass)}
            style={{ height: `${chartHeight}px`, width: `calc(100% - ${labelRem}rem)` }}
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id={arrowNorm}
                markerWidth="5"
                markerHeight="5"
                refX="4.2"
                refY="2.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L5,2.5 L0,5 z" fill="#64748b" />
              </marker>
              <marker
                id={arrowCrit}
                markerWidth="5"
                markerHeight="5"
                refX="4.2"
                refY="2.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L5,2.5 L0,5 z" fill="#dc2626" />
              </marker>
            </defs>
            {dependencies.map((line) => {
              const mx = line.midX;
              const d = `M ${line.x1} ${line.y1} C ${mx} ${line.y1}, ${mx} ${line.y2}, ${line.x2} ${line.y2}`;
              return (
                <path
                  key={line.key}
                  d={d}
                  fill="none"
                  stroke={line.critical ? '#dc2626' : '#94a3b8'}
                  strokeWidth={line.critical ? 0.65 : 0.45}
                  strokeOpacity={line.critical ? 0.9 : 0.55}
                  markerEnd={line.critical ? `url(#${arrowCrit})` : `url(#${arrowNorm})`}
                />
              );
            })}
          </svg>

          {taskRows.map((task, idx) => {
            const metrics = getBarMetrics(task);
            const styles = getBarBackground(task);
            const ringClass = task.is_critical
              ? task.is_delayed
                ? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-card dark:ring-offset-slate-900'
                : 'ring-2 ring-red-500/90 ring-offset-2 ring-offset-card dark:ring-offset-slate-900'
              : task.is_delayed
                ? 'ring-1 ring-amber-400/70 ring-offset-1 ring-offset-card'
                : '';

            return (
              <div
                key={task.id != null ? String(task.id) : `gantt-row-${idx}`}
                className={cn(
                  'flex border-b border-border/40 transition-colors last:border-0',
                  idx % 2 === 0 ? 'bg-card/50' : 'bg-muted/[0.35] dark:bg-slate-900/30',
                  'hover:bg-primary/[0.04] dark:hover:bg-slate-800/50',
                )}
              >
                <div
                  className={cn(
                    'sticky left-0 z-20 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/60 bg-card/95 px-3 py-2.5 shadow-[6px_0_16px_-8px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-slate-900/95 dark:shadow-[6px_0_20px_-8px_rgba(0,0,0,0.45)]',
                    labelWidthClass,
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/50 dark:ring-slate-700/50"
                      style={{ backgroundColor: task.status_color || '#64748b' }}
                    />
                    <span className="truncate text-sm font-medium text-foreground" title={task.name ?? 'Sans titre'}>
                      {task.name ?? 'Sans titre'}
                    </span>
                  </div>
                  {showProject && task.project_name && (
                    <span className="truncate pl-5 text-[11px] text-muted-foreground">{task.project_name}</span>
                  )}
                </div>

                <div className="relative flex-1 py-2.5" style={{ minHeight: `${rowHeight}px` }}>
                  <div
                    className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-15"
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / ${weekStripeCount} - 1px), rgba(148,163,184,0.22) calc(100% / ${weekStripeCount} - 1px), rgba(148,163,184,0.22) calc(100% / ${weekStripeCount}))`,
                    }}
                  />
                  {todayPercent != null && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-[5] w-px bg-emerald-500/25"
                      style={{ left: `${todayPercent}%` }}
                    />
                  )}
                  {metrics ? (
                    <div
                      className={cn(
                        'absolute top-1/2 z-20 h-7 -translate-y-1/2 overflow-hidden rounded-full shadow-lg transition-transform duration-200 group-hover/gantt:scale-[1.01]',
                        ringClass,
                      )}
                      style={{
                        left: `${metrics.left}%`,
                        width: `${Math.max(metrics.width, 0.35)}%`,
                        background: styles.gradient,
                        boxShadow: `0 2px 12px -2px ${styles.glow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                      }}
                      title={
                        task.is_critical
                          ? task.is_delayed
                            ? 'Tâche critique en retard'
                            : 'Chemin critique'
                          : task.is_delayed
                            ? 'Attention échéance'
                            : `${task.name ?? 'Sans titre'}`
                      }
                    >
                      {styles.overlay && (
                        <div
                          className="pointer-events-none absolute inset-0 rounded-full"
                          style={{ background: styles.overlay }}
                        />
                      )}
                      {(task.progress ?? task.progress_percent ?? 0) > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-white/25 dark:bg-black/20"
                          style={{ width: `${task.progress ?? task.progress_percent ?? 0}%` }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className="text-[10px] font-bold tabular-nums text-white drop-shadow-sm">
                          {task.progress ?? task.progress_percent ?? 0}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-7 items-center px-2">
                      <span className="text-xs italic text-muted-foreground">Pas de dates</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GanttLegend />
    </div>
  );
  } catch (renderErr) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-12 text-center text-sm text-muted-foreground">
        <p className="font-medium text-destructive">Erreur d&apos;affichage du Gantt</p>
        <p className="mt-2 text-xs">{renderErr?.message || 'Erreur inattendue.'}</p>
      </div>
    );
  }
}

function GanttLegend() {
  const items = [
    { key: 'low', label: 'Priorité basse', swatch: PRIORITY_STYLES.low.bar },
    { key: 'medium', label: 'Moyenne', swatch: PRIORITY_STYLES.medium.bar },
    { key: 'high', label: 'Haute', swatch: PRIORITY_STYLES.high.bar },
    { key: 'urgent', label: 'Urgente', swatch: PRIORITY_STYLES.urgent.bar },
    { key: 'critical', label: 'Chemin critique', swatch: CRITICAL_BAR, ring: true },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 dark:bg-slate-900/40">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Légende</span>
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm dark:bg-slate-800/80',
            item.ring && 'ring-1 ring-red-500/40',
          )}
        >
          <span
            className="h-2.5 w-6 rounded-full shadow-inner"
            style={{ background: item.swatch }}
          />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
        <span className="h-2 w-px bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        Ligne verticale = aujourd’hui
      </span>
    </div>
  );
}

export default GanttChart;
