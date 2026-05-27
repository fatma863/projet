import { PauseCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Full-width warning banner shown at the top of a paused project.
 *
 * Props:
 *   project     {object}  — project data (pause_reason, paused_at, paused_by_user, can_resume)
 *   onResume    {() => void}  — called when the inline resume button is clicked
 *   isResuming  {boolean}
 */
export default function ProjectPauseBanner({ project, onResume, isResuming }) {
  if (!project?.is_paused && project?.status !== 'on_hold') return null;

  const pausedAgo = project?.paused_at
    ? formatDistanceToNow(parseISO(project.paused_at), { addSuffix: true, locale: fr })
    : null;

  return (
    <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 shadow-sm dark:border-amber-700/60 dark:from-amber-950/40 dark:to-orange-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700 dark:bg-amber-800/60 dark:text-amber-400">
            <PauseCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              ⏸️ Ce projet est actuellement en pause
            </p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
              Toutes les modifications sont désactivées. Seuls les admins et les chefs de projet peuvent le reprendre.
            </p>
            {/* Meta: reason + who paused */}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-400">
              {project?.pause_reason && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium dark:bg-amber-800/50">
                  <span className="opacity-70">Raison :</span>&nbsp;
                  {project.pause_reason}
                </span>
              )}
              {project?.paused_by_user?.name && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-800/50">
                  <User className="h-3 w-3 opacity-70" />
                  {project.paused_by_user.name}
                </span>
              )}
              {pausedAgo && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-800/50">
                  <Clock className="h-3 w-3 opacity-70" />
                  {pausedAgo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: resume button (only if user has permission) */}
        {project?.can_resume && onResume && (
          <button
            onClick={onResume}
            disabled={isResuming}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {isResuming ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {isResuming ? 'Reprise…' : 'Reprendre le projet'}
          </button>
        )}
      </div>
    </div>
  );
}
