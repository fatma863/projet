import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, StarOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function FollowerButton({ projectId, className = '' }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['project-followers', projectId],
    queryFn: () => api.get(`/projects/${projectId}/followers`).then((r) => r.data),
    staleTime: 30000,
  });

  const isFollowing = data?.is_following ?? false;

  const followMut = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-followers', projectId] });
      toast.success('Vous suivez ce projet.');
    },
    onError: () => toast.error('Impossible de suivre ce projet.'),
  });

  const unfollowMut = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-followers', projectId] });
      toast.success('Vous ne suivez plus ce projet.');
    },
    onError: () => toast.error('Impossible de modifier le suivi.'),
  });

  const isPending = followMut.isPending || unfollowMut.isPending;

  const handleClick = () => {
    if (isPending) return;
    if (isFollowing) unfollowMut.mutate();
    else followMut.mutate();
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
      title={isFollowing ? 'Ne plus suivre ce projet' : 'Suivre ce projet'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      } ${className}`}
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : isFollowing ? (
        <StarOff size={13} />
      ) : (
        <Star size={13} />
      )}
      {isFollowing ? 'Ne plus suivre' : 'Suivre le projet'}
    </button>
  );
}
