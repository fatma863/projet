import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function WatcherButton({ taskId, className = '' }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['task-watchers', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/watchers`).then((r) => r.data),
    staleTime: 30000,
  });

  const isWatching = data?.is_watching ?? false;

  const watchMut = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/watch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-watchers', taskId] });
      toast.success('Vous surveillez cette tâche.');
    },
    onError: () => toast.error('Impossible de surveiller cette tâche.'),
  });

  const unwatchMut = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}/watch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-watchers', taskId] });
      toast.success('Vous ne surveillez plus cette tâche.');
    },
    onError: () => toast.error('Impossible de modifier le suivi.'),
  });

  const isPending = watchMut.isPending || unwatchMut.isPending;

  const handleClick = () => {
    if (isPending) return;
    if (isWatching) unwatchMut.mutate();
    else watchMut.mutate();
  };

  if (isLoading) {
    return (
      <button disabled className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground ${className}`}>
        <Loader2 size={13} className="animate-spin" />
        Chargement…
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={isWatching ? 'Ne plus surveiller' : 'Surveiller cette tâche'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isWatching
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      } ${className}`}
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : isWatching ? (
        <EyeOff size={13} />
      ) : (
        <Eye size={13} />
      )}
      {isWatching ? 'Ne plus surveiller' : 'Surveiller'}
    </button>
  );
}
