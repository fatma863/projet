import { useMemo } from 'react';
import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';
import { SkeletonTaskRow } from '../ui/Skeleton';

const COLUMNS = [
  { id: 'todo', label: 'À faire', accent: 'border-slate-200 bg-slate-50/80' },
  { id: 'in_progress', label: 'En cours', accent: 'border-amber-200 bg-amber-50/80' },
  { id: 'done', label: 'Terminé', accent: 'border-emerald-200 bg-emerald-50/80' },
  { id: 'at_risk', label: 'À risque', accent: 'border-red-200 bg-red-50/80' },
];

function normalizeTasks(tasks) {
  if (!tasks) return [];
  return Array.isArray(tasks) ? tasks : tasks.data || [];
}

function dueTimestamp(task) {
  const raw = task?.due_date || task?.deadline || null;
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}

function taskComparator(a, b) {
  const dateDiff = dueTimestamp(a) - dueTimestamp(b);
  if (dateDiff !== 0) return dateDiff;
  return String(a?.title || '').localeCompare(String(b?.title || ''), 'fr');
}

export function WorkflowBoard({ tasks, loading }) {
  const list = useMemo(() => normalizeTasks(tasks), [tasks]);

  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], done: [], at_risk: [] };
    list.forEach((t) => {
      const k = t.workflow_status && g[t.workflow_status] !== undefined ? t.workflow_status : 'todo';
      g[k].push(t);
    });
    Object.keys(g).forEach((key) => g[key].sort(taskComparator));
    return g;
  }, [list]);

  if (loading) {
    return (
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[1080px] gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex h-[min(72vh,680px)] min-h-[360px] flex-col gap-2 rounded-xl border-2 border-dashed p-3',
                col.accent,
              )}
            >
              <div className="mb-1 h-4 w-24 animate-pulse rounded bg-muted/80" />
              <SkeletonTaskRow />
              <SkeletonTaskRow />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[1080px] gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={cn(
              'flex h-[min(72vh,680px)] min-h-[360px] flex-col rounded-xl border-2 border-dashed p-3 transition-colors',
              col.accent
            )}
          >
            <div className="sticky top-0 z-10 -mx-3 mb-3 flex items-center justify-between border-b border-border/60 bg-card/85 px-3 pb-2 pt-0.5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {grouped[col.id]?.length ?? 0}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {(grouped[col.id] || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-background/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  Aucune tache dans cette colonne
                </div>
              )}
              {(grouped[col.id] || []).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  draggable={false}
                  compact
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
