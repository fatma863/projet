import { CalendarRange, Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

/**
 * ProjectDateBanner — Bandeau de dates projet visible dans toutes les vues.
 *
 * Affiche : nom, code, date de début, date de fin, durée totale, jours restants et progression.
 * Utilisé dans : ProjectDetailPage, GanttPage, CalendarPage, TaskFormPage, ClientDashboard.
 */

function fmtLong(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function diffDays(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export default function ProjectDateBanner({ project, compact = false }) {
  if (!project) return null;

  const { start_date, end_date, progress_percent = 0, name, code } = project;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start    = start_date ? new Date(start_date) : null;
  const end      = end_date   ? new Date(end_date)   : null;
  const duration = diffDays(start, end);
  const remaining = end ? Math.ceil((end - today) / 86400000) : null;

  const isOverdue = remaining !== null && remaining < 0;
  const isUrgent  = !isOverdue && remaining !== null && remaining <= 7;
  const isDone    = progress_percent >= 100 || project.status === 'completed';

  const remainingLabel = isDone
    ? 'Terminé'
    : isOverdue
      ? `${Math.abs(remaining)} j de retard`
      : remaining === 0
        ? 'Échéance aujourd\'hui'
        : `${remaining} j restants`;

  const remainingColor = isDone
    ? 'text-emerald-600 dark:text-emerald-400'
    : isOverdue
      ? 'text-destructive'
      : isUrgent
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  const barColor = isDone
    ? 'bg-emerald-500'
    : isOverdue
      ? 'bg-destructive'
      : 'bg-primary';

  return (
    <div
      className={`rounded-xl border border-border/60 bg-card shadow-sm ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Project identity */}
        <div className="flex items-center gap-2 min-w-0">
          <CalendarRange className="h-4 w-4 text-primary shrink-0" />
          <span className={`font-semibold text-foreground truncate ${compact ? 'text-sm' : 'text-base'}`}>
            {name}
          </span>
          {code && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
              {code}
            </span>
          )}
        </div>

        {/* Date metrics */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {start && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Début</span>
              <span className="font-medium text-foreground">{fmtLong(start)}</span>
            </div>
          )}

          {end && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fin</span>
              <span className="font-medium text-foreground">{fmtLong(end)}</span>
            </div>
          )}

          {duration !== null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{duration} jour{duration !== 1 ? 's' : ''}</span>
            </div>
          )}

          {remaining !== null && (
            <div className={`flex items-center gap-1 font-medium ${remainingColor}`}>
              {isDone
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                : (isOverdue || isUrgent)
                  ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  : <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              }
              <span>{remainingLabel}</span>
            </div>
          )}

          {progress_percent > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Avancement</span>
              <span className={`font-semibold ${progress_percent >= 100 ? 'text-emerald-600' : 'text-foreground'}`}>
                {progress_percent}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {start && end && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(0, progress_percent))}%` }}
            />
          </div>
          {!compact && (
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{fmtLong(start)}</span>
              <span>{fmtLong(end)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
