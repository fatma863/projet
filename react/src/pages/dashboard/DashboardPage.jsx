import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import UserManagement from '../../components/admin/UserManagement';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  ListTodo,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const isViewerUser = user?.roles?.includes('viewer');
  /** Compte applicatif « membre » (pas admin) : vue filtrée sur la participation */
  const isMember = user?.roles?.includes('member') && !isAdmin;

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });
  const { data: projectDashboards = [], isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboard-project-metrics', projects?.map((p) => p.id)],
    enabled: !!projects?.length,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map((project) => api.get(`/projects/${project.id}/dashboard`).then((r) => ({ projectId: project.id, ...r.data }))),
      );
      return responses;
    },
  });

  const { data: projectTasks = [], isLoading: loadingProjectTasks } = useQuery({
    queryKey: ['dashboard-tasks', isAdmin],
    enabled: isAdmin ? true : !!projects?.length,
    queryFn: async () => {
      if (isAdmin) {
        const res = await api.get('/tasks?all=1');
        const tasks = res.data.tasks?.data || res.data.tasks || [];
        return [{ projectId: 'all', tasks }];
      }
      const responses = await Promise.all(
        projects.map((project) => api.get(`/projects/${project.id}/tasks?all=1`).then((r) => ({ projectId: project.id, tasks: r.data.tasks?.data || r.data.data || [] }))),
      );
      return responses;
    },
  });

  if (loadingProjects || loadingDashboards || loadingProjectTasks) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const totalProjects = projects?.length || 0;
  const flatTasks = projectTasks.flatMap((entry) => entry.tasks || []);
  /** Membre : stats et alertes sur les tâches qui lui sont assignées. Invité : toutes les tâches visibles dans ses projets. */
  const scopeTasks =
    isAdmin
      ? flatTasks
      : isMember && !isViewerUser
        ? flatTasks.filter((t) =>
            (t.assignees || []).some((a) => (a.user?.id || a.id) === user?.id)
          )
        : flatTasks;
  const totalTasks = scopeTasks.length;
  const completedTasks = scopeTasks.filter((t) => (t.progress_percent || 0) >= 100);
  const overdueTasks = scopeTasks.filter((t) => t.is_overdue);
  const tasksAtRisk = scopeTasks.filter((t) => {
    const progress = t.progress_percent || 0;
    const priority = (t.priority || '').toLowerCase();
    const rl = (t.risk_level || '').toLowerCase();
    if (rl === 'high' || rl === 'medium') return true;
    return t.is_overdue || (priority === 'urgent' && progress < 60) || (priority === 'high' && progress < 40);
  });
  const projectProgress = projectDashboards.length
    ? Math.round(projectDashboards.reduce((sum, p) => sum + (p.avg_progress || 0), 0) / projectDashboards.length)
    : 0;

  const workloadPerUser = (() => {
    const map = new Map();
    flatTasks.forEach((task) => {
      (task.assignees || []).forEach((assignee) => {
        const u = assignee.user || assignee;
        if (!u?.id) return;
        const current = map.get(u.id) || { id: u.id, name: u.name || 'User', count: 0 };
        current.count += 1;
        map.set(u.id, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  const workloadMemberSelf = (() => {
    const uid = user?.id;
    if (!uid) return [];
    const count = scopeTasks.length;
    return [{ id: uid, name: user?.name || 'Moi', count }];
  })();

  const workloadByTeam = (() => {
    // Uses task.project_id -> project.team_id mapping.
    const projectTeamById = new Map((projects || []).map((p) => [p.id, p.team_id]));
    const map = new Map();
    flatTasks.forEach((task) => {
      const teamId = projectTeamById.get(task.project_id);
      if (!teamId) return;
      const current = map.get(teamId) || { id: teamId, name: `Équipe ${teamId}`, count: 0 };
      current.count += 1;
      map.set(teamId, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  const workloadEntries = isAdmin ? workloadByTeam : isMember && !isViewerUser ? workloadMemberSelf : workloadPerUser;

  const statusDistribution = [
    { label: 'Terminées', value: completedTasks.length, color: '#10b981' },
    { label: 'À risque', value: tasksAtRisk.length, color: '#f59e0b' },
    { label: 'En retard', value: overdueTasks.length, color: '#ef4444' },
  ];

  const workflowDistribution = [
    {
      label: 'À faire',
      value: scopeTasks.filter((t) => (t.workflow_status || 'todo') === 'todo').length,
      color: '#94a3b8',
    },
    {
      label: 'En cours',
      value: scopeTasks.filter((t) => t.workflow_status === 'in_progress').length,
      color: '#fbbf24',
    },
    {
      label: 'Terminé',
      value: scopeTasks.filter((t) => (t.workflow_status || '') === 'done').length,
      color: '#10b981',
    },
    {
      label: 'À risque (workflow)',
      value: scopeTasks.filter((t) => t.workflow_status === 'at_risk').length,
      color: '#ef4444',
    },
  ];

  const upcomingDeadlines = scopeTasks
    .filter((t) => {
      if (!t.due_date || (t.progress_percent || 0) >= 100) return false;
      const d = new Date(t.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 8);

  const riskyProjects = projectDashboards.filter((p) => (p.overdue_tasks || 0) > 0 || (p.avg_progress || 0) < 50);

  const aiRiskTotal = projectDashboards.reduce((s, p) => s + (p.ai_tasks_at_risk || 0), 0);
  const estActualAgg = projectDashboards.reduce(
    (acc, p) => {
      const ev = p.estimated_vs_actual;
      const est = ev?.estimated ?? p.total_estimated_hours ?? 0;
      const act = ev?.actual ?? p.total_actual_hours ?? 0;
      return { est: acc.est + Number(est), act: acc.act + Number(act) };
    },
    { est: 0, act: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.name} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Vue administrateur globale (projets, équipes, charge, retards)'
                : isMember && !isViewerUser
                  ? 'Vue membre : projets auxquels vous participez, tâches qui vous sont assignées et vos échéances.'
                  : isViewerUser
                    ? 'Vue invité : projets partagés avec vous (lecture).'
                    : 'Vue personnelle (vos projets et tâches).'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm">
            <Sparkles size={14} />
            Dashboard intelligent
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <StatCard
          icon={FolderKanban}
          label={isAdmin ? 'Projets totaux' : 'Mes projets'}
          value={totalProjects}
          sub={`${activeProjects.length} actifs`}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={ListTodo}
          label={isAdmin ? 'Tâches totales' : isMember && !isViewerUser ? 'Mes tâches assignées' : 'Mes tâches'}
          value={totalTasks}
          sub={`${completedTasks.length} terminées`}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="Progression projets"
          value={`${projectProgress}%`}
          sub="Moyenne globale"
          color="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={isAdmin ? 'Tâches en retard' : 'Mes tâches à risque'}
          value={tasksAtRisk.length}
          sub={`${overdueTasks.length} en retard`}
          color={tasksAtRisk.length > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}
        />

        {isAdmin && (
          <StatCard
            icon={AlertTriangle}
            label="Projets à risque"
            value={riskyProjects.length}
            sub={`${riskyProjects.filter((p) => (p.overdue_tasks || 0) > 0).length} avec retard`}
            color={riskyProjects.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}
          />
        )}
      </div>

      {isAdmin && (
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertes IA — vue globale</CardTitle>
            <p className="text-sm font-normal text-foreground">
              Tâches à risque (score IA) :{' '}
              <span className="font-semibold text-amber-700">{aiRiskTotal}</span> sur l’ensemble des projets.
              {' · '}
              Estimé cumulé {estActualAgg.est.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h vs réel{' '}
              {estActualAgg.act.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h
              {estActualAgg.est - estActualAgg.act !== 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (écart { (estActualAgg.est - estActualAgg.act).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) } h)
                </span>
              )}
            </p>
            <p className="text-sm font-normal text-muted-foreground">
              Retards, charge et suggestions d’assignation — détail dans IA &amp; Analytics.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Tâches prioritaires</p>
              {flatTasks.filter((t) => t.is_overdue || tasksAtRisk.some((x) => x.id === t.id)).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune alerte tâche pour le moment.</p>
              ) : (
                <ul className="space-y-2">
                  {flatTasks
                    .filter((t) => t.is_overdue || tasksAtRisk.some((x) => x.id === t.id))
                    .slice(0, 6)
                    .map((t) => {
                      const pname = projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                      return (
                        <li key={t.id}>
                          <Link
                            to={`/projects/${t.project_id}`}
                            className="flex flex-col rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                          >
                            <span className="font-medium text-foreground">{t.title}</span>
                            <span className="text-xs text-muted-foreground">{pname}</span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Projets à risque</p>
              {riskyProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet signalé.</p>
              ) : (
                <ul className="space-y-2">
                  {riskyProjects.slice(0, 6).map((rp) => {
                    const pname = projects?.find((p) => p.id === rp.projectId)?.name || `Projet #${rp.projectId}`;
                    return (
                      <li key={rp.projectId}>
                        <Link
                          to={`/projects/${rp.projectId}`}
                          className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/50"
                        >
                          <span className="font-medium text-foreground">{pname}</span>
                          <span className="text-xs text-muted-foreground">
                            {(rp.overdue_tasks || 0) > 0 ? `${rp.overdue_tasks} retard` : ''}{' '}
                            {Math.round(rp.avg_progress || 0)}% av.
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="lg:col-span-2">
              <Link
                to="/ai"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ouvrir IA &amp; Analytics <ArrowRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && <UserManagement variant="dashboard" />}

      {!isAdmin && tasksAtRisk.length > 0 && (
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isMember && !isViewerUser ? 'Vos tâches en retard ou à risque' : 'Alertes personnelles'}
            </CardTitle>
            {isMember && !isViewerUser && (
              <p className="text-sm font-normal text-muted-foreground">
                Uniquement les tâches qui vous sont assignées.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasksAtRisk
                .slice()
                .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
                .slice(0, 5)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.due_date ? `Échéance: ${new Date(t.due_date).toLocaleDateString('fr-FR')}` : 'Échéance: -'}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {t.is_overdue ? 'En retard' : 'Risque'}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isAdmin ? 'Charge de travail des équipes' : isMember && !isViewerUser ? 'Ma charge (tâches assignées)' : 'Ma charge de travail'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workloadEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune affectation trouvée</p>
            ) : workloadEntries.map((entry) => {
              const max = Math.max(...workloadEntries.map((u) => u.count), 1);
              return (
                <div key={entry.id}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{entry.name}</span>
                    <span>{entry.count} tâches</span>
                  </div>
                  <div className="h-2 rounded bg-accent">
                    <div className="h-2 rounded bg-blue-500" style={{ width: `${(entry.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isAdmin ? 'Distribution globale des tâches' : 'Distribution de mes tâches'}</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={statusDistribution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Flux workflow (à faire / en cours / terminé / à risque)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={workflowDistribution} />
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prochaines échéances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune échéance à venir dans le périmètre affiché.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingDeadlines.map((t) => {
                  const pname = projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/projects/${t.project_id}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/50"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">{t.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(t.due_date).toLocaleDateString('fr-FR')} · {pname}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{isAdmin ? 'Tous les projets' : 'Mes projets'}</h2>
          <Link to="/projects" className="flex items-center gap-1 text-sm text-primary transition-transform hover:translate-x-0.5 hover:underline">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        {projects?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun projet trouvé. Créez votre premier projet !
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects?.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SimplePieChart({ data }) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  let cumulative = 0;
  const gradient = data.map((segment, idx) => {
    const from = (cumulative / total) * 100;
    cumulative += segment.value;
    const to = (cumulative / total) * 100;
    return `${segment.color} ${from}% ${to}%`;
  }).join(', ');

  return (
    <div className="flex items-center gap-6">
      <div className="h-36 w-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="space-y-2">
        {data.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium text-foreground">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground transition-colors group-hover:text-primary">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }) {
  const statusVariant = {
    active: 'success',
    planning: 'warning',
    on_hold: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  };

  const statusLabel = {
    active: 'Actif',
    planning: 'Planification',
    on_hold: 'En pause',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };

  const progress = project.progress_percent || 0;

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base truncate mr-2">{project.name}</CardTitle>
            <Badge variant={statusVariant[project.status] || 'outline'}>
              {statusLabel[project.status] || project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {project.description || 'Aucune description'}
          </p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {project.tasks_count !== undefined && (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={14} />
                {project.tasks_count} tâches
              </span>
            )}
            {project.members_count !== undefined && (
              <span className="flex items-center gap-1">
                <Users size={14} />
                {project.members_count} membres
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
