import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import PauseProjectModal from './PauseProjectModal';
import { useProjectPause } from '../../hooks/useProjectPause';

/**
 * Smart pause / resume button for a project.
 *
 * Props:
 *   project     {object}  — project data (status, is_paused, can_pause, can_resume, name)
 *   projectId   {string|number}
 *   className   {string}  — extra Tailwind classes
 */
export default function ProjectPauseButton({ project, projectId, className = '' }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { pause, resume, isPausing, isResuming } = useProjectPause(projectId);

  const isPaused   = project?.is_paused || project?.status === 'on_hold';
  const canPause   = project?.can_pause;
  const canResume  = project?.can_resume;

  // Hide button entirely if the user has no permission for either action
  if (!canPause && !canResume) return null;

  // ── Resume ────────────────────────────────────────────────────────────────
  if (isPaused && canResume) {
    return (
      <Button
        variant="outline"
        className={`border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30 ${className}`}
        onClick={() => resume()}
        disabled={isResuming}
        title="Reprendre le projet (déverrouiller les modifications)"
      >
        {isResuming ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
        <span className="ml-2">{isResuming ? 'Reprise…' : 'Reprendre'}</span>
      </Button>
    );
  }

  // ── Pause ─────────────────────────────────────────────────────────────────
  if (!isPaused && canPause) {
    return (
      <>
        <Button
          variant="outline"
          className={`border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950/30 ${className}`}
          onClick={() => setModalOpen(true)}
          disabled={isPausing}
          title="Mettre le projet en pause (lecture seule)"
        >
          <Pause className="h-4 w-4" />
          <span className="ml-2">Pause</span>
        </Button>

        <PauseProjectModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={async (reason) => {
            await pause({ pause_reason: reason });
            setModalOpen(false);
          }}
          isPausing={isPausing}
          projectName={project?.name}
        />
      </>
    );
  }

  return null;
}
