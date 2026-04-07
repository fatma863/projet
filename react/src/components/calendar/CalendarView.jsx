import { useMemo } from 'react';
import { cn } from '../../lib/utils';

const PROJECT_PALETTE = [
  { dot: 'bg-sky-500', chip: 'border-sky-200 bg-sky-50 text-sky-700' },
  { dot: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { dot: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
  { dot: 'bg-rose-500', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
  { dot: 'bg-indigo-500', chip: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  { dot: 'bg-cyan-500', chip: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  { dot: 'bg-fuchsia-500', chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
  { dot: 'bg-lime-500', chip: 'border-lime-200 bg-lime-50 text-lime-700' },
];

const DEFAULT_PROJECT_STYLE = {
  dot: 'bg-slate-500',
  chip: 'border-slate-200 bg-slate-50 text-slate-700',
};

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const start = startOfWeekMonday(first);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function keyDay(d) {
  return d.toISOString().slice(0, 10);
}

export function CalendarView({ tasks = [], view, anchorDate, onOpenDay }) {
  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  const weeks = useMemo(() => {
    const y = anchorDate.getFullYear();
    const m = anchorDate.getMonth();
    return monthMatrix(y, m);
  }, [anchorDate]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const dates = [t.deadline, t.start_date, t.end_date].filter(Boolean);
      dates.forEach((ds) => {
        const k = ds.slice(0, 10);
        if (!map.has(k)) map.set(k, []);
        const arr = map.get(k);
        if (!arr.some((x) => x.id === t.id)) arr.push(t);
      });
    });
    return map;
  }, [tasks]);

  const projectStyleById = useMemo(() => {
    const ids = [];
    const seen = new Set();
    (tasks || []).forEach((t) => {
      const pid = String(t?.project?.id ?? 'none');
      if (!seen.has(pid)) {
        seen.add(pid);
        ids.push(pid);
      }
    });

    const map = new Map();
    ids.forEach((pid, idx) => {
      map.set(pid, PROJECT_PALETTE[idx % PROJECT_PALETTE.length]);
    });
    return map;
  }, [tasks]);

  const projectsByDay = useMemo(() => {
    const map = new Map();

    tasksByDay.forEach((list, dayKey) => {
      const byProject = new Map();

      list.forEach((t) => {
        const pid = String(t?.project?.id ?? 'none');
        if (!byProject.has(pid)) {
          byProject.set(pid, {
            projectId: t?.project?.id ?? null,
            projectName: t?.project?.name || 'Sans projet',
            tasks: [],
            style: projectStyleById.get(pid) || DEFAULT_PROJECT_STYLE,
          });
        }
        byProject.get(pid).tasks.push(t);
      });

      const groups = Array.from(byProject.values()).sort(
        (a, b) => b.tasks.length - a.tasks.length || a.projectName.localeCompare(b.projectName, 'fr')
      );
      map.set(dayKey, groups);
    });

    return map;
  }, [tasksByDay, projectStyleById]);

  const openDayDetails = (day, dayKey, groups) => {
    if (!onOpenDay) return;
    onOpenDay({
      dayKey,
      dateLabel: day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      projects: groups,
    });
  };

  const todayKey = keyDay(new Date());

  if (view === 'week') {
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const k = keyDay(day);
          const groups = projectsByDay.get(k) || [];
          const isToday = todayKey === k;
          return (
            <div
              key={k}
              className={cn(
                'min-h-[200px] rounded-lg border border-border bg-card p-2',
                isToday && 'ring-2 ring-primary/40'
              )}
            >
              <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div className="text-lg text-foreground">{day.getDate()}</div>
              </div>
              <div className="space-y-1.5">
                {groups.slice(0, 2).map((project) => (
                  <button
                    key={`${project.projectId || 'none'}-${k}`}
                    type="button"
                    onClick={() => openDayDetails(day, k, groups)}
                    className={cn(
                      'w-full rounded-md border px-2 py-1.5 text-left text-[11px] font-medium shadow-sm transition-colors hover:bg-accent/40',
                      project.style.chip
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', project.style.dot)} />
                      <span className="truncate">{project.projectName}</span>
                    </span>
                    <span className="mt-1 block text-[10px] opacity-80">{project.tasks.length} tâche(s)</span>
                  </button>
                ))}

                {groups.length > 2 && (
                  <button
                    type="button"
                    onClick={() => openDayDetails(day, k, groups)}
                    className="w-full rounded-md border border-dashed border-border px-2 py-1 text-left text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    Voir tout ({groups.length} projets)
                  </button>
                )}

                {groups.length === 0 && <div className="pt-1 text-[11px] text-muted-foreground">Aucun projet</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium text-muted-foreground">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {weeks.map((row, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {row.map((day) => {
            const k = keyDay(day);
            const inMonth = day.getMonth() === anchorDate.getMonth();
            const groups = projectsByDay.get(k) || [];
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                className={cn(
                  'min-h-[118px] rounded-md border border-border/80 bg-card p-2',
                  !inMonth && 'bg-muted/30 opacity-70',
                  isToday && 'ring-1 ring-primary/50'
                )}
              >
                <div className="text-right text-xs text-muted-foreground">{day.getDate()}</div>
                <div className="mt-1.5 space-y-1">
                  {groups.slice(0, 2).map((project) => (
                    <button
                      key={`${project.projectId || 'none'}-${k}`}
                      type="button"
                      onClick={() => openDayDetails(day, k, groups)}
                      className={cn(
                        'block w-full rounded border px-1.5 py-1 text-left text-[10px] font-medium leading-tight transition-colors hover:bg-accent/40',
                        project.style.chip
                      )}
                    >
                      <span className="flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full', project.style.dot)} />
                        <span className="truncate">{project.projectName}</span>
                      </span>
                    </button>
                  ))}

                  {groups.length > 2 && (
                    <button
                      type="button"
                      onClick={() => openDayDetails(day, k, groups)}
                      className="w-full rounded border border-dashed border-border px-1.5 py-1 text-left text-[10px] font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      Voir tout ({groups.length})
                    </button>
                  )}

                  {groups.length === 0 && <div className="text-[10px] text-muted-foreground">Aucun projet</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
