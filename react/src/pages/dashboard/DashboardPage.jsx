import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PROJECT_ROLE_LABELS, isGuestViewer } from '../../lib/roles';
import api from '../../lib/api';
import { POLL_INTERVAL_MS, unwrapCollection } from '../../lib/unwrapApi';
import { fetchActivityFeed, fetchAdminDashboard, fetchMemberDashboard } from '../../lib/services/dashboardApi';
import { acceptProjectInvite, declineProjectInvite, fetchMyInvites } from '../../lib/services/invitationsApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import UserManagement from '../../components/admin/UserManagement';
import { DashboardPageSkeleton, SkeletonActivityRow, Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { formatRelativeTimeFr } from '../../lib/formatRelativeTime';
import { humanizeActivityLine } from '../../lib/activityHumanize';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  ListTodo,
  Sparkles,
  Mail,
  Lock,
  History,
  XCircle,
  Plus,
  UserPlus,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes('admin');
  const isViewerUser = isGuestViewer(user);
  /** Compte applicatif « membre » (pas admin) : vue filtrée sur la participation */
  const isMember = user?.roles?.includes('member') && !isAdmin;
  /** Membres et invités (viewer) : API personnelle `/member/dashboard` (tâches assignées). */
  const usePersonalDashboardApi = !isAdmin && (isMember || isViewerUser);

  const { data: projectsPayload, isLoading: loadingProjects, isError: projectsError, error: projectsErr } = useQuery({
    queryKey: ['projects', 'dashboard'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data),
  });
  const projects = projectsPayload?.data ?? [];
  /** Total en base (pagination Laravel), pas seulement la page chargée */
  const projectsListTotal = projectsPayload?.meta?.total ?? projects.length;
  const { data: projectDashboards = [], isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboard-project-metrics', projects.map((p) => p.id)],
    enabled: projects.length > 0 && !isViewerUser,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map((project) => api.get(`/projects/${project.id}/dashboard`).then((r) => ({ projectId: project.id, ...r.data }))),
      );
      return responses;
    },
  });

  const { data: pendingInvites, isError: invitesError } = useQuery({
    queryKey: ['invitations-pending'],
    queryFn: fetchMyInvites,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const {
    data: memberDash,
    isLoading: loadingMemberDash,
    isError: memberDashError,
    error: memberDashErr,
  } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: fetchMemberDashboard,
    enabled: usePersonalDashboardApi,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const {
    data: adminDash,
    isLoading: loadingAdminDash,
    isError: adminDashError,
    error: adminDashErr,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
    enabled: isAdmin,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    error: activityErr,
  } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => fetchActivityFeed({ per_page: 12 }),
    enabled: !!user && !isViewerUser,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const acceptInviteMut = useMutation({
    mutationFn: (token) => acceptProjectInvite(token),
    onSuccess: () => {
      toast.success('Invitation acceptée. Bienvenue sur le projet.');
      queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Impossible d'accepter l'invitation.");
    },
  });

  const declineInviteMut = useMutation({
    mutationFn: (token) => declineProjectInvite(token),
    onSuccess: () => {
      toast.message('Invitation refusée');
      queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Action impossible.');
    },
  });

  const fetchTasksForDashboard = !isAdmin && usePersonalDashboardApi;

  const { data: projectTasks = [], isLoading: loadingProjectTasks } = useQuery({
    queryKey: ['dashboard-tasks', isAdmin, projects.map((p) => p.id).join(',')],
    enabled: isAdmin ? true : !fetchTasksForDashboard && projects.length > 0,
    queryFn: async () => {
      if (isAdmin) {
        const res = await api.get('/tasks?all=1');
        const tasks = res.data.tasks?.data || res.data.tasks || [];
        const meta = res.data.meta;
        return [{ projectId: 'all', tasks, meta }];
      }
      const responses = await Promise.all(
        projects.map((project) => api.get(`/projects/${project.id}/tasks?all=1`).then((r) => ({ projectId: project.id, tasks: r.data.tasks?.data || r.data.data || [] }))),
      );
      return responses;
    },
  });

  const awaitingMemberDash =
    usePersonalDashboardApi && loadingMemberDash && !memberDash && !memberDashError;
  const loadingMain =
    loadingProjects ||
    (!isViewerUser && loadingDashboards) ||
    (!fetchTasksForDashboard && loadingProjectTasks) ||
    awaitingMemberDash;
  if (loadingMain) {
    return <DashboardPageSkeleton showAdminColumn={isAdmin} />;
  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  /** Compteurs globaux admin : alignés sur l'API /admin/dashboard (vérité métier) */
  const totalProjects =
    isAdmin && adminDash?.projects_total != null ? adminDash.projects_total : projectsListTotal;
  const flatTasks = projectTasks.flatMap((entry) => entry.tasks || []);
  /** Membre API : pas de flatTasks ; invité / admin : agrégation projets. */
  const scopeTasks =
    isAdmin
      ? flatTasks
      : usePersonalDashboardApi
        ? []
        : isMember && !isViewerUser
          ? flatTasks.filter((t) =>
              (t.assignees || []).some((a) => (a.user?.id || a.id) === user?.id)
            )
          : flatTasks;

  const ms = memberDash?.summary;
  const totalTasks = usePersonalDashboardApi
    ? (ms?.total_assigned ?? 0)
    : isAdmin && adminDash?.tasks_total != null
      ? adminDash.tasks_total
      : scopeTasks.length;
  const completedTasks = usePersonalDashboardApi ? [] : scopeTasks.filter((t) => (t.progress_percent || 0) >= 100);
  const completedCount = usePersonalDashboardApi
    ? (ms?.completed ?? 0)
    : isAdmin && adminDash?.tasks_completed != null
      ? adminDash.tasks_completed
      : completedTasks.length;
  const overdueTasks = usePersonalDashboardApi ? [] : scopeTasks.filter((t) => t.is_overdue);
  const overdueCount = usePersonalDashboardApi
    ? (ms?.overdue_count ?? 0)
    : isAdmin && adminDash?.tasks_overdue != null
      ? adminDash.tasks_overdue
      : overdueTasks.length;
  const tasksAtRisk = usePersonalDashboardApi
    ? []
    : scopeTasks.filter((t) => {
        const progress = t.progress_percent || 0;
        const priority = (t.priority || '').toLowerCase();
        const rl = (t.risk_level || '').toLowerCase();
        if (rl === 'high' || rl === 'medium') return true;
        return t.is_overdue || (priority === 'urgent' && progress < 60) || (priority === 'high' && progress < 40);
      });
  const tasksAtRiskList = usePersonalDashboardApi ? (memberDash?.at_risk_tasks || []) : tasksAtRisk;
  const tasksAtRiskCount = usePersonalDashboardApi ? (ms?.at_risk_count ?? tasksAtRiskList.length) : tasksAtRisk.length;

  const projectProgress =
    isAdmin && adminDash?.global_completion_rate_percent != null
      ? Math.round(Number(adminDash.global_completion_rate_percent))
      : projectDashboards.length > 0
        ? Math.round(
            projectDashboards.reduce((sum, p) => sum + (p.avg_progress || 0), 0) / projectDashboards.length,
          )
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
    const count = usePersonalDashboardApi ? totalTasks : scopeTasks.length;
    return [{ id: uid, name: user?.name || 'Moi', count }];
  })();

  const workloadByTeam = (() => {
    // Regroupe les tâches par équipe (via project.team_id).
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

  const workloadEntries = isAdmin ? workloadByTeam : usePersonalDashboardApi ? workloadMemberSelf : workloadPerUser;

  const statusDistribution = usePersonalDashboardApi
    ? [
        { label: 'Terminées', value: ms?.completed ?? 0, color: '#10b981' },
        { label: 'En cours', value: ms?.in_progress ?? 0, color: '#3b82f6' },
        { label: 'À faire', value: ms?.todo ?? 0, color: '#94a3b8' },
        { label: 'En retard', value: ms?.overdue_count ?? 0, color: '#ef4444' },
      ]
    : isAdmin && adminDash
      ? [
          { label: 'Terminées', value: adminDash.tasks_completed ?? 0, color: '#10b981' },
          { label: 'À risque', value: tasksAtRisk.length, color: '#f59e0b' },
          { label: 'En retard', value: adminDash.tasks_overdue ?? 0, color: '#ef4444' },
        ]
      : [
          { label: 'Terminées', value: completedTasks.length, color: '#10b981' },
          { label: 'À risque', value: tasksAtRisk.length, color: '#f59e0b' },
          { label: 'En retard', value: overdueTasks.length, color: '#ef4444' },
        ];

  const workflowDistribution = usePersonalDashboardApi
    ? [
        { label: 'À faire', value: ms?.todo ?? 0, color: '#94a3b8' },
        { label: 'En cours', value: ms?.in_progress ?? 0, color: '#fbbf24' },
        { label: 'Terminé', value: ms?.completed ?? 0, color: '#10b981' },
        { label: 'À risque', value: ms?.at_risk_count ?? 0, color: '#f59e0b' },
      ]
    : [
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

  const upcomingDeadlines = usePersonalDashboardApi
    ? (memberDash?.upcoming_deadlines || []).slice(0, 8)
    : scopeTasks
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

  const activities = unwrapCollection(activityData, 'activities');

  const guestOverdueList = isViewerUser && memberDash ? (memberDash.overdue_tasks || []).slice(0, 12) : [];
  /** Projets dérivés des tâches assignées ; sinon liste des projets visibles (invité). */
  const guestAssignedProjects = (() => {
    if (!isViewerUser || !memberDash) return null;
    const ids = new Set();
    ['overdue_tasks', 'upcoming_deadlines', 'recent_tasks', 'at_risk_tasks'].forEach((k) => {
      (memberDash[k] || []).forEach((t) => {
        if (t?.project_id) ids.add(t.project_id);
      });
    });
    const fromTasks = projects.filter((p) => ids.has(p.id));
    if (fromTasks.length > 0) return { projects: fromTasks, fallback: false };
    return { projects, fallback: projects.length > 0 };
  })();

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {(projectsError || memberDashError || adminDashError || (!isViewerUser && activityError) || invitesError) && (
        <Card className="border-red-200 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/40">
          <CardContent className="space-y-1 py-3 text-sm text-red-900 dark:text-red-100">
            {projectsError && <p>Projets : {projectsErr?.message || 'Impossible de charger la liste des projets.'}</p>}
            {memberDashError && <p>Tableau personnel : {memberDashErr?.message || 'Erreur API.'}</p>}
            {adminDashError && <p>Tableau admin : {adminDashErr?.message || 'Erreur API.'}</p>}
            {!isViewerUser && activityError && <p>Activité : {activityErr?.message || 'Erreur API.'}</p>}
            {invitesError && <p>Invitations : erreur de chargement.</p>}
          </CardContent>
        </Card>
      )}

      {/* Hero / Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-6 shadow-sm dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-500/80 dark:text-indigo-300/60">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.name} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Vue administrateur — supervision globale des projets, équipes et indicateurs clés."
                : isMember && !isViewerUser
                  ? "Vue membre — vos projets actifs, tâches assignées et prochaines échéances."
                  : "Vue invité — vos tâches assignées et les projets auxquels vous participez."}
            </p>
          </div>
          {!isViewerUser && (
            <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800/95 dark:text-indigo-200 dark:ring-slate-600">
              <Sparkles size={14} className="shrink-0" />
              Dashboard intelligent
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap gap-2"
      >
        {!isViewerUser && (
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Link>
        )}
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
        >
          <ListTodo className="h-4 w-4 text-primary" />
          Voir mes tâches
        </Link>
        {!isViewerUser && (
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
          >
            <UserPlus className="h-4 w-4 text-primary" />
            Inviter un membre
          </Link>
        )}
      </motion.div>

      {/* ─── Viewer: compact KPIs ─────────────────────────────────── */}
      {isViewerUser && memberDash && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={ListTodo}
            label="Tâches assignées"
            value={totalTasks}
            sub={`${completedCount} terminée${completedCount !== 1 ? 's' : ''}`}
            color="text-emerald-600 bg-emerald-50"
          />
          <StatCard
            icon={Clock}
            label="En cours"
            value={ms?.in_progress ?? 0}
            sub="Tâches actives"
            color="text-blue-600 bg-blue-50"
          />
          <StatCard
            icon={AlertTriangle}
            label="En retard"
            value={ms?.overdue_count ?? guestOverdueList.length}
            sub="À traiter en priorité"
            color={(ms?.overdue_count ?? guestOverdueList.length) > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}
          />
        </div>
      )}

      {/* ─── Admin: platform overview ─────────────────────────────── */}
      {isAdmin && (
        <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Vue d'ensemble plateforme</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">Indicateurs globaux — actualisation automatique.</p>
          </CardHeader>
          <CardContent>
            {loadingAdminDash && !adminDash ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
                ))}
              </div>
            ) : adminDash ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Users size={16} /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Utilisateurs</p><p className="text-xl font-bold tabular-nums">{adminDash.users_total ?? 0}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FolderKanban size={16} /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Projets</p><p className="text-xl font-bold tabular-nums">{adminDash.projects_total ?? 0}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><ListTodo size={16} /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tâches</p><p className="text-xl font-bold tabular-nums">{adminDash.tasks_total ?? 0}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={16} /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Complétion</p><p className="text-xl font-bold tabular-nums">{adminDash.global_completion_rate_percent ?? 0}%</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600"><AlertTriangle size={16} /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-wide text-red-700/70 dark:text-red-300/60">En retard</p><p className="text-xl font-bold tabular-nums text-red-700">{adminDash.tasks_overdue ?? 0}</p></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Indisponible</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Stats cards — key metrics (admin + member) ───────────── */}
      {!isViewerUser && (
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
            sub={`${completedCount} terminées`}
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
            value={tasksAtRiskCount}
            sub={`${overdueCount} en retard`}
            color={tasksAtRiskCount > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}
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
      )}

      {/* ─── Invitations en attente ───────────────────────────────── */}
      {pendingInvites?.pending_count > 0 && (
        <Card className="border-amber-200 bg-amber-50/90 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-amber-950 dark:text-amber-100">
              <Mail className="h-5 w-5 shrink-0" />
              Invitations en attente
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                {pendingInvites.pending_count}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-900/90 dark:text-amber-100/90">
              Vous avez été invité à rejoindre des projets. Acceptez ou refusez depuis la page dédiée.
            </p>
            {pendingInvites.invitations?.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-lg border border-amber-100 bg-white/70 p-4 dark:border-amber-900/40 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">{inv.project?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rôle proposé :{' '}
                    {inv.role === 'client' || inv.role === 'guest' || inv.role === 'viewer'
                      ? PROJECT_ROLE_LABELS.client
                      : PROJECT_ROLE_LABELS.member}
                    {inv.invited_by?.name ? ` · Invité par ${inv.invited_by.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled={acceptInviteMut.isPending || declineInviteMut.isPending}
                    onClick={() => acceptInviteMut.mutate(inv.token)}
                  >
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={acceptInviteMut.isPending || declineInviteMut.isPending}
                    onClick={() => declineInviteMut.mutate(inv.token)}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Refuser
                  </Button>
                  <Link to={`/accept-invite?token=${encodeURIComponent(inv.token)}`}>
                    <Button size="sm" variant="ghost" type="button">
                      Détails
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {(acceptInviteMut.isError || declineInviteMut.isError) && (
              <p className="text-sm text-red-700 dark:text-red-300">
                {acceptInviteMut.error?.response?.data?.message ||
                  declineInviteMut.error?.response?.data?.message ||
                  'Action impossible.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Member: charge & dépendances ────────────────────────── */}
      {isMember && !isViewerUser && ms && (
        <Card className="border-slate-200 bg-slate-50/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base text-foreground">
              <Lock className="h-4 w-4 shrink-0 text-slate-600" />
              Charge &amp; dépendances
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Synthèse de votre charge — tâches bloquées, à risque, critiques et retards (actualisation automatique).
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-muted-foreground">Bloquées</p>
              <p className="text-2xl font-semibold text-foreground">{ms.blocked_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-muted-foreground">À risque</p>
              <p className="text-2xl font-semibold text-amber-800">{ms.at_risk_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-muted-foreground">Critiques</p>
              <p className="text-2xl font-semibold text-red-700">{ms.critical_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-muted-foreground">En retard</p>
              <p className="text-2xl font-semibold text-foreground">{ms.overdue_count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Admin: alertes IA ────────────────────────────────────── */}
      {isAdmin && (
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertes IA — vue globale</CardTitle>
            <p className="text-sm font-normal text-foreground">
              Tâches à risque (score IA) :{' '}
              <span className="font-semibold text-amber-700">{aiRiskTotal}</span> sur l'ensemble des projets.
              {' · '}
              Estimé cumulé {estActualAgg.est.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h vs réel{' '}
              {estActualAgg.act.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h
              {estActualAgg.est - estActualAgg.act !== 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (écart {(estActualAgg.est - estActualAgg.act).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h)
                </span>
              )}
            </p>
            <p className="text-sm font-normal text-muted-foreground">
              Retards, charge et suggestions d'assignation — détail dans IA &amp; Analytics.
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
                            to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                            className="block rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                          >
                            <span className="font-medium text-foreground">{t.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{pname}</span>
                            <DashboardTaskBadges task={t} />
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

      {/* ─── Admin: user management ───────────────────────────────── */}
      {isAdmin && <UserManagement variant="dashboard" />}

      {/* ─── Member: tâches à risque ──────────────────────────────── */}
      {!isAdmin && !isViewerUser && tasksAtRiskList.length > 0 && (
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
              {tasksAtRiskList
                .slice()
                .sort((a, b) => (a.due_date || a.effective_end_date || '').localeCompare(b.due_date || b.effective_end_date || ''))
                .slice(0, 5)
                .map((t) => (
                  <Link
                    key={t.id}
                    to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all hover:border-amber-200/80 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(t.due_date || t.effective_end_date)
                            ? `Échéance : ${new Date(t.due_date || t.effective_end_date).toLocaleDateString('fr-FR')}`
                            : 'Échéance : —'}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {t.is_overdue ? 'En retard' : 'À risque'}
                      </Badge>
                    </div>
                    <DashboardTaskBadges task={t} />
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Activité récente ─────────────────────────────────────── */}
      {!isViewerUser && (
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading && activities.length === 0 ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonActivityRow key={i} />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <EmptyState
                icon={History}
                title="Aucune activité récente"
                description="Les actions sur vos projets apparaîtront ici."
              >
                {!isViewerUser && (
                  <Link
                    to="/projects"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Créer une tâche
                  </Link>
                )}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {activities.map((a, idx) => {
                  const { line, quote, extra } = humanizeActivityLine(a, user);
                  const actorName = a.actor?.name || 'Membre';
                  return (
                    <motion.li
                      key={a.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      className="flex gap-3 py-3 first:pt-0"
                    >
                      <UserAvatar name={actorName} src={a.actor?.avatar_url} size="lg" className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          {line}
                          {quote && <span className="font-semibold"> {quote}</span>}
                          {extra && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">{extra}</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.created_at ? formatRelativeTimeFr(a.created_at) : ''}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Charge de travail + Distribution ────────────────────── */}
      {!isViewerUser && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {isAdmin ? 'Charge de travail des équipes' : isMember && !isViewerUser ? 'Ma charge (tâches assignées)' : 'Ma charge de travail'}
              </CardTitle>
              {usePersonalDashboardApi && ms?.workload_percent != null && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Charge relative (tâches non terminées / seuil)</span>
                    <span className="font-semibold text-foreground">{ms.workload_percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-accent">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${ms.workload_percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {ms.workload_open_tasks ?? 0} tâche(s) ouverte(s)
                  </p>
                </div>
              )}
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
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full transition-all ${(entry.count / max) > 0.7 ? 'bg-red-500' : (entry.count / max) > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(entry.count / max) * 100}%` }}
                      />
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
      )}

      {/* ─── Flux workflow + Prochaines échéances ────────────────── */}
      {!isViewerUser && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Flux workflow</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">Répartition par statut : à faire, en cours, terminé, à risque.</p>
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
                <EmptyState
                  icon={Calendar}
                  title="Aucune échéance à venir"
                  description="Les prochaines dates limites s'afficheront ici."
                  className="border-0 bg-transparent py-6"
                >
                  <Link
                    to="/projects"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Créer une tâche
                  </Link>
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {upcomingDeadlines.map((t) => {
                    const pname =
                      t.project_name || projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                    const end = t.due_date || t.effective_end_date;
                    return (
                      <li key={t.id}>
                        <Link
                          to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                          className="block rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-medium text-foreground">{t.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {end ? new Date(end).toLocaleDateString('fr-FR') : '—'}
                            </span>
                          </div>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{pname}</span>
                          <DashboardTaskBadges task={t} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Member: tâches récentes ──────────────────────────────── */}
      {usePersonalDashboardApi && !isViewerUser && (memberDash?.recent_tasks?.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mes tâches récentes (assignées)</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">Liste issue de votre espace membre.</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {memberDash.recent_tasks.map((t) => {
                const pname = t.project_name || projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                return (
                  <li key={t.id}>
                    <Link
                      to={`/projects/${t.project_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/50"
                    >
                      <span className="font-medium text-foreground">{t.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {pname} · {t.progress_percent ?? 0}%
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ─── Projects list (admin + member) ──────────────────────── */}
      {!isViewerUser && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <h2 className="text-base font-semibold text-foreground">{isAdmin ? 'Tous les projets' : 'Mes projets'}</h2>
            </div>
            <Link to="/projects" className="flex items-center gap-1 text-sm text-primary transition-transform hover:translate-x-0.5 hover:underline">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Aucun projet pour l'instant"
              description="Créez un projet pour organiser vos tâches et inviter votre équipe."
            >
              <Link
                to="/projects"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Nouveau projet
              </Link>
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Viewer: tâches en retard + projets assignés ─────────── */}
      {isViewerUser && (
        <>
          <Card className="border-red-100/80 shadow-sm dark:border-red-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Mes tâches en retard
              </CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Tâches assignées dont l'échéance est dépassée (non terminées).
              </p>
            </CardHeader>
            <CardContent>
              {guestOverdueList.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Aucune tâche en retard"
                  description="Vous êtes à jour sur vos échéances."
                  className="border-0 bg-transparent py-6"
                >
                  <Link
                    to="/tasks"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <ListTodo className="h-4 w-4" />
                    Voir mes tâches
                  </Link>
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {guestOverdueList.map((t) => {
                    const pname =
                      t.project_name || projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                    return (
                      <li key={t.id}>
                        <Link
                          to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                          className="block rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                        >
                          <span className="font-medium text-foreground">{t.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{pname}</span>
                          <DashboardTaskBadges task={t} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {guestAssignedProjects && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FolderKanban className="h-4 w-4" />
                      {guestAssignedProjects.fallback ? 'Mes projets' : 'Mes projets assignés'}
                    </CardTitle>
                    <p className="text-sm font-normal text-muted-foreground">
                      {guestAssignedProjects.fallback
                        ? 'Projets auxquels vous avez accès.'
                        : 'Projets où vous avez des tâches assignées.'}
                    </p>
                  </div>
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Voir tout <ArrowRight size={14} />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {guestAssignedProjects.projects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title="Aucun projet"
                    description="Aucun projet ne vous a encore été partagé."
                    className="border-0 bg-transparent py-6"
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {guestAssignedProjects.projects.slice(0, 6).map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DashboardTaskBadges({ task }) {
  const wf = task.workflow_status || 'todo';
  const done = task.is_done || (task.progress_percent || 0) >= 100;
  const atRisk = wf === 'at_risk' || task.is_at_risk;
  const deps = task.dependencies;
  const depCount = Array.isArray(deps) ? deps.length : 0;

  return (
    <div className="flex flex-wrap gap-1">
      {done && (
        <Badge className="border-emerald-200 bg-emerald-50 text-xs font-normal text-emerald-900">Terminé</Badge>
      )}
      {!done && task.is_overdue && <Badge variant="destructive" className="text-xs font-normal">En retard</Badge>}
      {!done && !task.is_overdue && atRisk && (
        <Badge className="border-amber-200 bg-amber-100 text-xs font-normal text-amber-900">À risque</Badge>
      )}
      {task.is_blocked && (
        <Badge variant="secondary" className="text-xs font-normal">Bloqué</Badge>
      )}
      {depCount > 0 && (
        <Badge variant="outline" className="text-xs font-normal">
          Dépend de {depCount} tâche{depCount > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}

function SimplePieChart({ data }) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  let cumulative = 0;
  const gradient = data.map((segment) => {
    const from = (cumulative / total) * 100;
    cumulative += segment.value;
    const to = (cumulative / total) * 100;
    return `${segment.color} ${from}% ${to}%`;
  }).join(', ');
  const sum = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-center"
    >
      <div className="relative shrink-0">
        <div
          className="h-40 w-40 rounded-full shadow-md ring-4 ring-border/30"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="absolute inset-0 m-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-card text-center text-xs font-semibold leading-tight text-muted-foreground shadow-inner">
          <span>
            {sum}
            <span className="block font-normal text-[10px] text-muted-foreground/80">total</span>
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {data.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: segment.color }} />
              <span className="truncate text-muted-foreground">{segment.label}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">{segment.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const accentBar = color.includes('blue') ? 'from-blue-400 to-blue-600'
    : color.includes('emerald') ? 'from-emerald-400 to-emerald-600'
    : color.includes('indigo') ? 'from-indigo-400 to-indigo-600'
    : color.includes('red') ? 'from-red-400 to-red-600'
    : color.includes('amber') ? 'from-amber-400 to-amber-600'
    : 'from-slate-300 to-slate-500';
  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accentBar}`} />
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground transition-colors group-hover:text-primary">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }) {
  const statusBar = {
    active: 'from-emerald-400 to-emerald-500',
    planning: 'from-amber-400 to-amber-500',
    on_hold: 'from-slate-300 to-slate-400',
    completed: 'from-blue-400 to-blue-500',
    cancelled: 'from-red-400 to-red-500',
  };
  const statusLabel = {
    active: 'Actif',
    planning: 'Planification',
    on_hold: 'En pause',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };
  const statusVariant = {
    active: 'success',
    planning: 'warning',
    on_hold: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  };
  const progress = project.progress_percent || 0;
  const bar = statusBar[project.status] || 'from-slate-300 to-slate-400';
  const progressColor = progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="group relative h-full cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${bar}`} />
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</CardTitle>
            <Badge variant={statusVariant[project.status] || 'outline'} className="shrink-0 text-xs">
              {statusLabel[project.status] || project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {project.description || 'Aucune description'}
          </p>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${progressColor}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {project.tasks_count !== undefined && (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {project.tasks_count} tâches
              </span>
            )}
            {project.members_count !== undefined && (
              <span className="flex items-center gap-1">
                <FolderKanban size={12} className="text-blue-500" />
                {project.members_count} membres
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
