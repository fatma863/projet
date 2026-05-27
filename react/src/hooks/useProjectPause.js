import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../lib/api';

/**
 * Provides pause / resume mutations for a project.
 *
 * Usage:
 *   const { pause, resume, isPausing, isResuming } = useProjectPause(projectId);
 *   pause({ pause_reason: '...' });
 *   resume();
 */
export function useProjectPause(projectId) {
  const queryClient = useQueryClient();

  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ['project', String(projectId)] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project-dashboard', String(projectId)] });
  };

  // ── PAUSE ────────────────────────────────────────────────────────────────
  const pauseMutation = useMutation({
    mutationFn: ({ pause_reason }) =>
      api.post(`/projects/${projectId}/pause`, { pause_reason }).then((r) => r.data),

    onMutate: async ({ pause_reason }) => {
      // Optimistic update: immediately mark the project as paused in cache
      await queryClient.cancelQueries({ queryKey: ['project', String(projectId)] });
      const previous = queryClient.getQueryData(['project', String(projectId)]);

      queryClient.setQueryData(['project', String(projectId)], (old) => {
        if (!old) return old;
        return {
          ...old,
          status: 'on_hold',
          is_paused: true,
          pause_reason,
          paused_at: new Date().toISOString(),
        };
      });

      return { previous };
    },

    onSuccess: (data) => {
      // Replace optimistic data with server response
      const updated = data?.project;
      if (updated) {
        queryClient.setQueryData(['project', String(projectId)], updated);
      }
      invalidateProject();
      toast.success('⏸️ Projet mis en pause avec succès.');
    },

    onError: (err, _vars, ctx) => {
      // Roll back optimistic update
      if (ctx?.previous) {
        queryClient.setQueryData(['project', String(projectId)], ctx.previous);
      }
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de mettre le projet en pause.';
      toast.error(msg);
    },
  });

  // ── RESUME ───────────────────────────────────────────────────────────────
  const resumeMutation = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/resume`).then((r) => r.data),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['project', String(projectId)] });
      const previous = queryClient.getQueryData(['project', String(projectId)]);

      queryClient.setQueryData(['project', String(projectId)], (old) => {
        if (!old) return old;
        return {
          ...old,
          status: old.previous_status ?? 'active',
          is_paused: false,
          pause_reason: null,
          paused_at: null,
        };
      });

      return { previous };
    },

    onSuccess: (data) => {
      const updated = data?.project;
      if (updated) {
        queryClient.setQueryData(['project', String(projectId)], updated);
      }
      invalidateProject();
      toast.success('▶️ Projet repris avec succès.');
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['project', String(projectId)], ctx.previous);
      }
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de reprendre le projet.';
      toast.error(msg);
    },
  });

  return {
    pause:     (vars) => pauseMutation.mutateAsync(vars),
    resume:    ()     => resumeMutation.mutateAsync(),
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    pauseError:  pauseMutation.error,
    resumeError: resumeMutation.error,
  };
}
