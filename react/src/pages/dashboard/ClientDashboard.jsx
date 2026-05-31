import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { POLL_INTERVAL_MS } from '../../lib/unwrapApi';
import { fetchMemberDashboard } from '../../lib/services/dashboardApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DashboardPageSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ListTodo,
  Eye,
  MessageSquare,
  FileDown,
  BarChart3,
  Activity,
  Calendar,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import ProjectDateBanner from '../../components/projects/ProjectDateBanner';

const ALERT_CARD_CLASS = {
  danger:  'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20',
  warning: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40',
  success: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40',
};

const ALERT_ICON_CLASS = {
  danger:  'text-red-600',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
};

const ALERT_TEXT_CLASS = {
  danger:  'font-medium text-red-900 dark:text-red-100',
  warning: 'font-medium text-amber-900 dark:text-amber-100',
  success: 'text-emerald-900 dark:text-emerald-100',
};

/**
 * Dashboard dédié à l'expérience CLIENT (rôle viewer/invité).
 *
 * Vision : comprendre + suivre, pas gérer.
 * Sections :
 *  1. Avancement global (progress bar)
 *  2. Deadline estimée + alertes
 *  3. Mes tâches (lecture seule)
 *  4. Projets assignés avec progression
 *  5. Activité récente
 *  6. Rapports IA (si disponible)
 */
export default function ClientDashboard() {
  const { user } = useAuth();

  // ── Données personnelles (tâches assignées, résumé) ──
  const {
    data: memberDash,
    isLoading: loadingMemberDash,
    isError: memberDashError,
  } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: fetchMemberDashboard,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  // ── Liste des projets accessibles ──
  const {
    data: projectsPayload,
    isLoading: loadingProjects,
  } = useQuery({
    queryKey: ['projects', 'dashboard'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data),
  });
  const projects = projectsPayload?.data ?? [];

  // ── Rapports IA par projet (premier projet accessible) ──
  const firstProject = projects[0];
  const {
    data: clientReport,
    isLoading: loadingReport,
  } = useQuery({
    queryKey: ['client-report', firstProject?.id],
    queryFn: () => api.get(`/client/projects/${firstProject.id}/report`).then((r) => r.data),
    enabled: !!firstProject?.id,
    staleTime: 30000,
  });

  const isLoading = loadingProjects || loadingMemberDash;
  if (isLoading && !memberDash) {
    return <DashboardPageSkeleton />;
  }

  const ms = memberDash?.summary;
  const totalTasks = ms?.total_assigned ?? 0;
  const completedCount = ms?.completed ?? 0;
  const inProgressCount = ms?.in_progress ?? 0;
  const overdueCount = ms?.overdue_count ?? 0;
  const atRiskCount = ms?.at_risk_count ?? 0;
  const overallProgress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const overdueTasks = memberDash?.overdue_tasks || [];
  const upcomingDeadlines = (memberDash?.upcoming_deadlines || []).slice(0, 5);
  const recentTasks = (memberDash?.recent_tasks || []).slice(0, 5);

  // Alertes agrégées
  const alerts = [];
  if (overdueCount > 0) alerts.push({ type: 'danger', icon: AlertTriangle, message: `${overdueCount} tâche(s) en retard` });
  if (atRiskCount > 0) alerts.push({ type: 'warning', icon: Shield, message: `${atRiskCount} tâche(s) à risque` });
  if (alerts.length === 0) alerts.push({ type: 'success', icon: CheckCircle2, message: 'Tout est en bonne voie.' });

  // Deadline estimée (du rapport IA ou des tâches)
  const estimatedDeadline = clientReport?.estimated_deadline
    || upcomingDeadlines[upcomingDeadlines.length - 1]?.due_date;

  // Rapport IA
  const aiRisk = clientReport?.ai_risk_analysis;
  const aiRecs = clientReport?.ai_recommendations;

  // Overdue card styling (computed outside JSX to reduce complexity)
  const hasOverdue = overdueCount > 0;
  const overdueCardExtra = hasOverdue ? 'border-red-200 dark:border-red-900/40' : '';
  const overdueBar = hasOverdue ? 'from-red-400 to-red-600' : 'from-emerald-400 to-emerald-600';
  const overdueIcon = hasOverdue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600';

  // Progress bar color (computed outside JSX to reduce complexity)
  const progressColor = overallProgress >= 80 ? 'bg-emerald-500' : overallProgress >= 40 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="space-y-6">
      {/* ─── Hero section client ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-sm dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-200/40 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-600/80 dark:text-emerald-300/60">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.name} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Espace client — suivez l'avancement de vos projets en temps réel.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800/95 dark:text-emerald-200 dark:ring-slate-600">
            <Eye size={14} className="shrink-0" />
            Vue client
          </div>
        </div>
      </div>

      {/* ─── Avancement global + Deadline + Alertes ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Progression globale */}
        <Card className="group relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Avancement global</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{overallProgress}%</p>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-2.5 rounded-full ${progressColor}`}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{completedCount}/{totalTasks} tâches terminées</p>
          </CardContent>
        </Card>

        {/* Deadline estimée */}
        <Card className="group relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deadline estimée</p>
              <p className="text-lg font-bold text-foreground">
                {estimatedDeadline
                  ? new Date(estimatedDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* En cours */}
        <Card className="group relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-400 to-indigo-600" />
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">Tâches actives</p>
            </div>
          </CardContent>
        </Card>

        {/* En retard */}
        <Card className={`group relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${overdueCardExtra}`}>
          <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${overdueBar}`} />
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdueIcon}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">En retard</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">À traiter en priorité</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Alertes ─── */}
      {alerts.length > 0 && (
        <Card className={`shadow-sm ${ALERT_CARD_CLASS[alerts[0].type]}`}>
          <CardContent className="flex flex-wrap gap-3 py-4">
            {alerts.map((alert, idx) => {
              const Icon = alert.icon;
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Icon size={16} className={ALERT_ICON_CLASS[alert.type]} />
                  <span className={ALERT_TEXT_CLASS[alert.type]}>{alert.message}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Mes tâches en retard ─── */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-100/80 shadow-sm dark:border-red-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Tâches en retard
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Tâches dont l'échéance est dépassée.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {overdueTasks.slice(0, 6).map((t) => {
                const pname = t.project_name || `Projet #${t.project_id}`;
                return (
                  <li key={t.id}>
                    <Link
                      to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm transition-all hover:border-red-200/80 hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{pname}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {t.due_date && (
                          <span className="text-xs text-red-600 font-medium">
                            {new Date(t.due_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <Badge variant="destructive" className="text-xs">En retard</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ─── Projets + Échéances à venir (2 colonnes) ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mes projets */}
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-4 w-4" />
                Mes projets
              </CardTitle>
              <Link to="/projects" className="flex items-center gap-1 text-sm text-primary hover:underline">
                Voir tout <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Aucun projet"
                description="Vous n'avez pas encore été invité à un projet."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <ul className="space-y-3">
                {projects.slice(0, 5).map((project) => {
                  const progress = project.progress_percent || 0;
                  const progressColor = progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-500' : 'bg-amber-500';
                  return (
                    <li key={project.id}>
                      <Link to={`/projects/${project.id}`} className="block">
                        <ProjectDateBanner project={project} compact />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prochaines échéances */}
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Prochaines échéances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucune échéance à venir"
                description="Les prochaines dates limites s'afficheront ici."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <ul className="space-y-2">
                {upcomingDeadlines.map((t) => {
                  const end = t.due_date || t.effective_end_date;
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/projects/${t.project_id}?highlightTask=${t.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.project_name || `Projet #${t.project_id}`}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {end ? new Date(end).toLocaleDateString('fr-FR') : '—'}
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

      {/* ─── Tâches récentes (lecture seule) ─── */}
      {recentTasks.length > 0 && (
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="h-4 w-4" />
                Tâches récentes
              </CardTitle>
              <Link to="/tasks" className="flex items-center gap-1 text-sm text-primary hover:underline">
                Voir toutes <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-sm font-normal text-muted-foreground">Vos tâches assignées — consultation uniquement.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Tâche</th>
                    <th className="pb-2 font-medium text-muted-foreground">Statut</th>
                    <th className="hidden pb-2 font-medium text-muted-foreground sm:table-cell">Priorité</th>
                    <th className="hidden pb-2 font-medium text-muted-foreground md:table-cell">Échéance</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Avancement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentTasks.map((t) => (
                    <tr key={t.id} className="group">
                      <td className="py-2.5 pr-3">
                        <Link to={`/projects/${t.project_id}?highlightTask=${t.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {t.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{t.project_name || `Projet #${t.project_id}`}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <WorkflowBadge status={t.workflow_status} />
                      </td>
                      <td className="hidden py-2.5 pr-3 sm:table-cell">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="hidden py-2.5 pr-3 text-xs text-muted-foreground md:table-cell">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs font-semibold tabular-nums">{t.progress_percent ?? 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Rapports IA (🔥 section PFE) ─── */}
      {(aiRisk || aiRecs) && (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Rapports intelligents
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Analyse automatique basée sur l'intelligence artificielle.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risque de retard */}
            {aiRisk && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Risque de retard</p>
                  <p className={`text-2xl font-bold tabular-nums ${aiRisk.delay_probability > 60 ? 'text-red-600' : aiRisk.delay_probability > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {aiRisk.delay_probability}%
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Santé planning</p>
                  <p className={`text-lg font-bold ${aiRisk.schedule_health === 'critical' ? 'text-red-600' : aiRisk.schedule_health === 'watch' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {aiRisk.schedule_health === 'critical' ? '⚠️ Critique' : aiRisk.schedule_health === 'watch' ? '👀 À surveiller' : '✅ Bonne'}
                  </p>
                </div>
                {aiRisk.summary && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Tâches à risque</p>
                    <p className="text-2xl font-bold tabular-nums text-amber-600">{aiRisk.summary.at_risk ?? 0}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recommandations */}
            {aiRecs?.recommendations && aiRecs.recommendations.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">💡 Recommandations</p>
                <ul className="space-y-2">
                  {(Array.isArray(aiRecs.recommendations) ? aiRecs.recommendations : [aiRecs.recommendations]).slice(0, 4).map((rec, idx) => {
                    const text = typeof rec === 'string' ? rec : rec.message || rec.recommendation || JSON.stringify(rec);
                    return (
                      <li key={idx} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
                        <span className="mt-0.5 text-indigo-500">→</span>
                        <span className="text-foreground">{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Performance équipe */}
            {clientReport?.team && clientReport.team.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  <Users className="inline h-4 w-4 mr-1" />
                  Équipe du projet
                </p>
                <div className="flex flex-wrap gap-2">
                  {clientReport.team.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-foreground">{m.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">({m.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Livrables / Fichiers ─── */}
      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4" />
            Livrables &amp; fichiers
          </CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Consultez et téléchargez les fichiers partagés sur vos projets.
          </p>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={FileDown}
              title="Aucun fichier"
              description="Les fichiers partagés apparaîtront ici."
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <FolderKanban size={16} className="text-primary" />
                    <span className="font-medium text-foreground">{project.name}</span>
                  </div>
                  <span className="text-xs text-primary hover:underline flex items-center gap-1">
                    Voir fichiers <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Actions rapides ─── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
        >
          <Eye className="h-4 w-4 text-primary" />
          Voir mes tâches
        </Link>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
        >
          <MessageSquare className="h-4 w-4 text-primary" />
          Notifications
        </Link>
        {projects.length > 0 && (
          <Link
            to={`/projects/${projects[0].id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
          >
            <Activity className="h-4 w-4 text-primary" />
            Détails du projet
          </Link>
        )}
      </motion.div>

      {/* ─── Error state ─── */}
      {memberDashError && (
        <Card className="border-red-200 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/40">
          <CardContent className="py-3 text-sm text-red-900 dark:text-red-100">
            Impossible de charger les données du tableau de bord.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Petits composants utilitaires ── */

function ProjectStatusBadge({ status }) {
  const map = {
    active: { label: 'En cours', variant: 'success' },
    planning: { label: 'Planification', variant: 'warning' },
    on_hold: { label: 'En pause', variant: 'secondary' },
    completed: { label: 'Terminé', variant: 'default' },
    cancelled: { label: 'Annulé', variant: 'destructive' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={variant} className="shrink-0 text-xs">{label}</Badge>;
}

function WorkflowBadge({ status }) {
  const map = {
    todo: { label: 'À faire', cls: 'bg-slate-100 text-slate-700' },
    in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
    done: { label: 'Terminé', cls: 'bg-emerald-100 text-emerald-700' },
    at_risk: { label: 'À risque', cls: 'bg-amber-100 text-amber-700' },
  };
  const { label, cls } = map[status] || { label: status || 'À faire', cls: 'bg-slate-100 text-slate-700' };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    urgent: { label: 'Urgent', cls: 'text-red-600' },
    high: { label: 'Haute', cls: 'text-amber-600' },
    medium: { label: 'Moyenne', cls: 'text-blue-600' },
    low: { label: 'Basse', cls: 'text-slate-500' },
  };
  const { label, cls } = map[priority] || { label: priority || '—', cls: 'text-slate-500' };
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}
