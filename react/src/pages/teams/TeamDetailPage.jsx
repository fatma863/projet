import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, Plus, Trash2, Users, ChevronDown, ChevronRight } from 'lucide-react';

/** Rôle métier / fonction (pivot team_user) — distinct des permissions projet */
const JOB_ROLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'developer', label: 'Développeur' },
  { value: 'tester', label: 'Testeur / QA' },
];

const PROJECT_ROLE_LABELS = {
  admin: 'Admin',
  member: 'Membre',
  client: 'Client',
  guest: 'Client',
  viewer: 'Client',
};
const PROJECT_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Membre' },
  { value: 'client', label: 'Client' },
];

const JOB_ROLE_LABELS = {
  lead: 'Lead',
  developer: 'Développeur',
  tester: 'Testeur / QA',
};

function normalizeJobRoleKey(role) {
  if (role == null || role === '') return 'developer';
  if (role === 'member' || role === 'designer') return 'developer';
  return role;
}

function formatProjectRoleLabel(role, teamHasProjects) {
  if (role == null || role === '') {
    return teamHasProjects ? 'Non défini' : 'Aucun projet';
  }
  return PROJECT_ROLE_LABELS[role] || role;
}

function projectRoleBadgeVariant(role) {
  if (role == null || role === '') return 'outline';
  if (role === 'admin') return 'default';
  if (role === 'client' || role === 'guest' || role === 'viewer') return 'outline';
  return 'secondary';
}

function normalizeProjectRole(role) {
  if (!role) return 'member';
  if (role === 'guest' || role === 'viewer') return 'client';
  return role;
}

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

/** Sélecteur de spécialités (cards toggle) */
function SpecialtiesEditor({ memberId, currentSpecialties = [], allSpecialties = [], onSave, isSaving }) {
  const currentIds = useMemo(() => new Set((currentSpecialties || []).map((s) => s.id)), [currentSpecialties]);
  const [selected, setSelected] = useState(currentIds);

  useEffect(() => {
    setSelected(new Set((currentSpecialties || []).map((s) => s.id)));
  }, [currentSpecialties]);

  const toggle = (sid) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    return next;
  });

  const hasChanged = useMemo(() => {
    if (selected.size !== currentIds.size) return true;
    for (const sid of selected) if (!currentIds.has(sid)) return true;
    return false;
  }, [selected, currentIds]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allSpecialties.map((s) => {
          const active = selected.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
              style={active ? { backgroundColor: s.color } : {}}
            >
              {active && <span className="text-[10px]">✓</span>}
              {s.name}
            </button>
          );
        })}
        {allSpecialties.length === 0 && (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        )}
      </div>
      {hasChanged && (
        <Button
          size="sm"
          onClick={() => onSave(memberId, [...selected])}
          disabled={isSaving}
          className="h-7 text-xs"
        >
          {isSaving ? 'Sauvegarde…' : 'Enregistrer les spécialités'}
        </Button>
      )}
    </div>
  );
}

export default function TeamDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('developer');
  const [capacity, setCapacity] = useState('40');
  const [addSpecialtyIds, setAddSpecialtyIds] = useState(new Set());
  const [roleDrafts, setRoleDrafts] = useState({});
  const [projectRoleDrafts, setProjectRoleDrafts] = useState({});
  const [openSpecialtyPanels, setOpenSpecialtyPanels] = useState({});

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

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get('/specialties').then((r) => r.data?.specialties ?? []),
    staleTime: 5 * 60_000,
  });

  const memberIds = new Set((team?.members || []).map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setShowAdd(false);
      setUserId('');
      setAddSpecialtyIds(new Set());
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

  const updateProjectRoleMutation = useMutation({
    mutationFn: ({ uid, project_role }) => api.patch(`/teams/${id}/members/${uid}/project-role`, { project_role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', id] }),
  });

  const updateSpecialtiesMutation = useMutation({
    mutationFn: ({ uid, specialty_ids }) => api.patch(`/teams/${id}/members/${uid}/specialties`, { specialty_ids }),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setOpenSpecialtyPanels((prev) => ({ ...prev, [uid]: false }));
    },
  });

  useEffect(() => {
    const drafts = {};
    (team?.members || []).forEach((m) => { drafts[m.id] = normalizeJobRoleKey(m.job_role || m.role_in_team); });
    setRoleDrafts(drafts);
    const projectDrafts = {};
    (team?.members || []).forEach((m) => {
      projectDrafts[m.id] = normalizeProjectRole(m.project_role);
    });
    setProjectRoleDrafts(projectDrafts);
  }, [team]);

  const toggleSpecialtyPanel = (memberId) => {
    setOpenSpecialtyPanels((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const toggleAddSpecialty = (sid) => {
    setAddSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

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
            <span>{team.members_count || team.members?.length || 0} membres</span>
            <span>{team.projects_count || 0} projets</span>
          </div>
        </div>
      </div>

      {/* Section membres */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Membres</h2>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
          </Button>
        </div>

        {/* Formulaire d'ajout */}
        {showAdd && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-xs font-medium">Utilisateur</label>
                  <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full min-w-[200px]">
                    <option value="">Choisir un utilisateur…</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </Select>
                  {availableUsers.length === 0 && allUsers.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Tous les utilisateurs sont déjà dans cette équipe.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Fonction (équipe)</label>
                  <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">
                    {JOB_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                  <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
                    Rôle projet (permissions) : défini dans chaque projet lié à cette équipe.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Capacité (h/sem)</label>
                  <Input type="number" min={0} max={60} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-24" />
                </div>
              </div>

              {/* Spécialités lors de l'ajout */}
              {allSpecialties.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium">
                    Spécialités
                    <span className="ml-1 font-normal text-muted-foreground">(compétences du membre — optionnel)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allSpecialties.map((s) => {
                      const active = addSpecialtyIds.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleAddSpecialty(s.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                            active
                              ? 'border-transparent text-white shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
                          )}
                          style={active ? { backgroundColor: s.color } : {}}
                        >
                          {active && <span className="text-[10px]">✓</span>}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                onClick={() => addMutation.mutate({
                  user_id: parseInt(userId),
                  role_in_team: role,
                  capacity_hours_per_week: parseInt(capacity),
                  specialty_ids: [...addSpecialtyIds],
                })}
                disabled={!userId || addMutation.isPending}
              >
                {addMutation.isPending ? 'Ajout…' : 'Ajouter'}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Accès projet</strong> (Admin, Membre, Client) : permissions dans les projets de cette équipe.{' '}
          <strong className="text-foreground">Fonction</strong> (Lead, Développeur, Testeur / QA) : rôle métier dans l&apos;équipe.{' '}
          <strong className="text-foreground">Spécialités</strong> : compétences réelles (Backend, Frontend, DevOps…).
        </p>

        {/* Liste des membres */}
        <div className="space-y-2">
          {team.members?.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun membre dans cette équipe</p>
              </CardContent>
            </Card>
          )}

          {team.members?.map((m) => {
            const jobKey = m.job_role || m.role_in_team;
            const teamHasProjects = (team.projects_count ?? team.projects?.length ?? 0) > 0;
            const pr = m.project_role;
            const workload = workloadPresentation(m.capacity_hours_per_week);
            const techSkills = filterTechnicalSkills(m.skills);
            const memberSpecialties = m.specialties || [];
            const specialtyPanelOpen = Boolean(openSpecialtyPanels[m.id]);

            return (
              <div key={m.id} className="overflow-hidden rounded-lg border border-border bg-card">
                {/* Ligne principale */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Avatar + identité */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                      {m.name?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    </div>
                  </div>

                  {/* Contrôles droite */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:items-end">
                    <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">

                      {/* Sélecteur accès projet */}
                      <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-2 py-1">
                        <Select
                          value={projectRoleDrafts[m.id] || normalizeProjectRole(pr)}
                          onChange={(e) => setProjectRoleDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          className="h-8 w-32 text-xs"
                          title="Accès projet"
                        >
                          {PROJECT_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </Select>
                        <Button
                          type="button" size="sm" variant="outline" className="h-8 px-2 text-xs"
                          disabled={
                            !teamHasProjects || updateProjectRoleMutation.isPending
                            || (projectRoleDrafts[m.id] || normalizeProjectRole(pr)) === normalizeProjectRole(pr)
                          }
                          onClick={() => updateProjectRoleMutation.mutate({
                            uid: m.id,
                            project_role: projectRoleDrafts[m.id] || normalizeProjectRole(pr),
                          })}
                          title={teamHasProjects ? 'Enregistrer accès projet' : 'Aucun projet lié'}
                        >
                          Enregistrer
                        </Button>
                      </div>
                      {!teamHasProjects && (
                        <Badge variant={projectRoleBadgeVariant(pr)} className="font-normal" title="Accès projet agrégé">
                          {formatProjectRoleLabel(pr, teamHasProjects)}
                        </Badge>
                      )}

                      {/* Sélecteur fonction */}
                      <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-2 py-1">
                        <Select
                          value={roleDrafts[m.id] || normalizeJobRoleKey(jobKey)}
                          onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          className="h-8 w-36 text-xs"
                        >
                          {JOB_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </Select>
                        <Button
                          type="button" size="sm" variant="outline" className="h-8 px-2 text-xs"
                          disabled={
                            updateRoleMutation.isPending
                            || (roleDrafts[m.id] || normalizeJobRoleKey(jobKey)) === normalizeJobRoleKey(jobKey)
                          }
                          onClick={() => updateRoleMutation.mutate({ uid: m.id, role_in_team: roleDrafts[m.id] || normalizeJobRoleKey(jobKey) })}
                        >
                          Enregistrer
                        </Button>
                      </div>

                      {/* Capacité */}
                      <span
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums', workload.className)}
                        title="Charge hebdomadaire"
                      >
                        {m.capacity_hours_per_week != null ? `${m.capacity_hours_per_week} h/semaine` : '—'}
                        {workload.label && <span className="text-[10px] opacity-90">{workload.label}</span>}
                      </span>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => { if (window.confirm('Retirer ce membre ?')) removeMutation.mutate(m.id); }}
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40"
                        aria-label="Retirer le membre"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Compétences techniques (skills pivot) */}
                    {techSkills.length > 0 && (
                      <div className="flex w-full flex-wrap justify-end gap-1.5">
                        {techSkills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[11px] font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Spécialités affichées + bouton modifier */}
                    <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">Spécialités :</span>
                      {memberSpecialties.length > 0
                        ? memberSpecialties.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: s.color || '#6366f1' }}
                          >
                            {s.name}
                          </span>
                        ))
                        : <span className="text-[11px] italic text-muted-foreground">Aucune</span>}
                      <button
                        type="button"
                        onClick={() => toggleSpecialtyPanel(m.id)}
                        className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        title="Modifier les spécialités"
                      >
                        Modifier
                        {specialtyPanelOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel d'édition des spécialités */}
                {specialtyPanelOpen && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                      Spécialités de {m.name}
                      <span className="ml-1 font-normal text-muted-foreground">— cliquez pour activer / désactiver</span>
                    </p>
                    <SpecialtiesEditor
                      memberId={m.id}
                      currentSpecialties={memberSpecialties}
                      allSpecialties={allSpecialties}
                      onSave={(uid, specialtyIds) => updateSpecialtiesMutation.mutate({ uid, specialty_ids: specialtyIds })}
                      isSaving={updateSpecialtiesMutation.isPending && updateSpecialtiesMutation.variables?.uid === m.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
