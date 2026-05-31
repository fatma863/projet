import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { UserSelect } from '../../components/ui/UserSelect';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';


const SKILL_BLOCKLIST = new Set([
  'process', 'tests manuels', 'tests manuel', 'gestion', 'gestion de projet',
  'scrum', 'agile', 'tests', 'manuels', 'processus', 'qualité', 'documentation', 'communication',
]);
const SKILL_ALLOWLIST = new Set([
  'php', 'laravel', 'react', 'mysql', 'playwright', 'javascript', 'typescript',
  'tailwind', 'vite', 'docker', 'redis', 'html', 'css', 'git', 'vue', 'symfony',
  'node', 'nodejs', 'node.js', 'jest', 'cypress',
]);

function filterTechnicalSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0 && s.length < 48)
    .filter((s) => {
      const k = s.toLowerCase();
      if (SKILL_BLOCKLIST.has(k)) return false;
      if (SKILL_ALLOWLIST.has(k)) return true;
      return /^[A-Za-z0-9.#+][A-Za-z0-9.#+\-_\s]{1,22}$/.test(s)
        && !/^(process|gestion|tests)$/i.test(s);
    });
}

function workloadPresentation(hours) {
  const n = Number(hours);
  if (Number.isNaN(n)) return { label: '', className: 'border-border/80 bg-muted/20 text-muted-foreground' };
  if (n <= 20) return { label: 'Partiel', className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' };
  if (n <= 34) return { label: 'Modéré', className: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100' };
  return { label: 'Plein temps', className: 'border-red-500/35 bg-red-500/10 text-red-900 dark:text-red-100' };
}


export default function TeamDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [capacity, setCapacity] = useState('40');

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then((r) => (
      r.data?.data ?? r.data?.team ?? r.data?.team?.data ?? r.data
    )),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-team-add'],
    enabled: Boolean(showAdd && team),
    queryFn: () => api.get('/users?per_page=500').then((r) => r.data?.data ?? []),
  });

  const memberIds = new Set((team?.members || []).map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setShowAdd(false);
      setUserId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/teams/${id}/members/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', id] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ uid, role_in_team }) => api.patch(`/teams/${id}/members/${uid}`, { role_in_team }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (!team) {
    return <div className="py-20 text-center text-muted-foreground">Équipe non trouvée</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <Link to="/teams" className="mt-1 rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          {team.team_leader?.name && (
            <p className="mt-1 text-sm text-foreground">
              Chef d&apos;équipe : <span className="font-medium">{team.team_leader.name}</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{team.members_count || team.members?.length || 0} {t('teams.members').toLowerCase()}</span>
            <span>{team.projects_count || 0} {t('teams.projects').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Section membres */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('teams.members')}</h2>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-4 w-4" /> {t('teams.addMember')}
          </Button>
        </div>

        {/* Formulaire d'ajout */}
        {showAdd && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium">Utilisateur</label>
                <UserSelect
                  users={availableUsers}
                  value={userId}
                  onChange={(v) => setUserId(v)}
                  placeholder={
                    allUsers.length > 0 && availableUsers.length === 0
                      ? t('teams.noOtherUsers')
                      : 'Choisir un utilisateur…'
                  }
                  disabled={availableUsers.length === 0}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Capacité (h/sem)</label>
                <Input type="number" min={0} max={60} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-24" />
              </div>
              <Button
                size="sm"
                onClick={() => addMutation.mutate({
                  user_id: parseInt(userId),
                  role_in_team: 'developer',
                  capacity_hours_per_week: parseInt(capacity),
                })}
                disabled={!userId || addMutation.isPending}
              >
                {addMutation.isPending ? 'Ajout…' : t('common.add')}
              </Button>
            </CardContent>
          </Card>
        )}


        {/* Liste des membres */}
        <div className="space-y-2">
          {team.members?.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('teams.noTeams')}</p>
              </CardContent>
            </Card>
          )}

          {team.members?.map((m) => {
            const isChef = m.id === team.team_leader_id;
            const workload = workloadPresentation(m.capacity_hours_per_week);
            const techSkills = filterTechnicalSkills(m.skills);
            const memberSpecialties = m.specialties || [];

            return (
              <div key={m.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Avatar + identité */}
                  <div className="flex min-w-0 items-center gap-3">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-background" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                        {m.name?.[0] || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{m.name}</p>
                        {isChef
                          ? <Badge variant="default" className="text-[11px]">{t('projects.chefDeProjet')}</Badge>
                          : <Badge variant="secondary" className="text-[11px]">Membre</Badge>}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    </div>
                  </div>

                  {/* Contrôles droite */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:items-end">
                    <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">

                      {/* Capacité */}
                      <span
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums', workload.className)}
                        title="Charge hebdomadaire"
                      >
                        {m.capacity_hours_per_week != null ? `${m.capacity_hours_per_week} h/semaine` : '—'}
                        {workload.label && <span className="text-[10px] opacity-90">{workload.label}</span>}
                      </span>

                      {/* Désigner chef */}
                      {!isChef && (
                        <Button
                          type="button" size="sm" variant="outline" className="h-8 px-2 text-xs"
                          disabled={updateRoleMutation.isPending}
                          onClick={() => updateRoleMutation.mutate({ uid: m.id, role_in_team: 'lead' })}
                        >
                          Désigner chef
                        </Button>
                      )}

                      {/* Retirer */}
                      <button
                        type="button"
                        onClick={() => { if (window.confirm(t('teams.deleteConfirm'))) removeMutation.mutate(m.id); }}
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40"
                        aria-label={t('teams.removeMember')}
                        disabled={isChef}
                        title={isChef ? 'Désignez un autre chef avant de retirer' : t('teams.removeMember')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Compétences techniques */}
                    {techSkills.length > 0 && (
                      <div className="flex w-full flex-wrap justify-end gap-1.5">
                        {techSkills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[11px] font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Spécialités (lecture seule) */}
                    {memberSpecialties.length > 0 && (
                      <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Spécialités :</span>
                        {memberSpecialties.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: s.color || '#6366f1' }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
