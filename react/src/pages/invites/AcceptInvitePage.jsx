import { useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { FolderKanban, PartyPopper, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PROJECT_ROLE_LABELS } from '../../lib/roles';
import { cn } from '../../lib/utils';

const linkBtnOutline =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const linkBtnDefault =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginHref = `/login?redirect=${encodeURIComponent(`/accept-invite?token=${encodeURIComponent(token || '')}`)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(`/accept-invite?token=${encodeURIComponent(token || '')}`)}`;

  const verifyQuery = useQuery({
    queryKey: ['invite-verify', token],
    queryFn: async () => {
      try {
        const { data } = await api.get('/invitations/verify', { params: { token } });
        return data;
      } catch (e) {
        const d = e.response?.data;
        if (d && typeof d === 'object') {
          return {
            valid: false,
            message: d.message || 'Cette invitation est invalide ou a expiré.',
            ...d,
          };
        }
        throw e;
      }
    },
    enabled: Boolean(token),
    retry: false,
  });

  const invite = verifyQuery.data?.invitation;
  const isValid = verifyQuery.data?.valid === true;

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/invitations/${encodeURIComponent(token)}/accept`),
    onSuccess: (response) => {
      toast.success('Invitation acceptée');
      const pid = response.data?.project?.id;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
      if (pid) {
        navigate(`/projects/${pid}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.post(`/invitations/${encodeURIComponent(token)}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
      navigate('/', { replace: true });
    },
  });

  const roleLabel = useMemo(() => {
    const r = invite?.role;
    if (r === 'client' || r === 'guest' || r === 'viewer') return PROJECT_ROLE_LABELS.client;
    if (r === 'member') return PROJECT_ROLE_LABELS.member;
    return r || '—';
  }, [invite?.role]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Lien invalide
            </CardTitle>
            <CardDescription>
              Aucun jeton d’invitation dans l’URL. Demandez un nouveau lien au responsable du projet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/" className={cn(linkBtnOutline, 'w-full')}>
              Retour à l’accueil
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifyQuery.isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!verifyQuery.data?.valid) {
    const msg = verifyQuery.data?.message || 'Cette invitation est invalide ou a expiré.';
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Invitation non valide
            </CardTitle>
            <CardDescription>{msg}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link to="/" className={cn(linkBtnOutline, 'w-full')}>
              Retour à l’accueil
            </Link>
            {!user && (
              <Link to={loginHref} className={cn(linkBtnDefault, 'w-full')}>
                Se connecter avec un autre compte
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderKanban size={24} />
            </div>
            <CardTitle>Invitation au projet</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte avec l’adresse <strong>{invite?.email}</strong> pour accepter cette invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to={loginHref} className={cn(linkBtnDefault, 'w-full sm:w-auto')}>
              Se connecter
            </Link>
            <Link to={registerHref} className={cn(linkBtnOutline, 'w-full sm:w-auto')}>
              Créer un compte
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Vous avez été invité&nbsp;!</CardTitle>
          <CardDescription className="text-base">
            Rejoignez l’équipe sur ce projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Projet</dt>
              <dd className="text-right font-semibold text-foreground">{invite?.project?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Invité par</dt>
              <dd className="text-right font-medium text-foreground">{invite?.invited_by?.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Rôle</dt>
              <dd className="text-right font-medium text-foreground">{roleLabel}</dd>
            </div>
          </dl>

          {(acceptMutation.isError || declineMutation.isError) && (
            <p className="text-center text-sm text-destructive">
              {acceptMutation.error?.response?.data?.message ||
                declineMutation.error?.response?.data?.message ||
                'Une erreur est survenue.'}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              className="w-full sm:flex-1"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => acceptMutation.mutate()}
            >
              {acceptMutation.isPending ? <Spinner size="sm" className="text-white" /> : 'Accepter et rejoindre'}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => declineMutation.mutate()}
            >
              {declineMutation.isPending ? <Spinner size="sm" /> : 'Refuser'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
