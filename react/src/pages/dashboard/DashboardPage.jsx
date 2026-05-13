import { useState, useEffect } from 'react';
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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardPageSkeleton, SkeletonActivityRow, Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { formatRelativeTimeFr } from '../../lib/formatRelativeTime';
import { humanizeActivityLine } from '../../lib/activityHumanize';
import { cn } from '../../lib/utils';
import {
  FolderKanban, CheckCircle2, AlertTriangle, Clock,
  Users, ArrowRight, ListTodo, Sparkles, Mail,
  History, XCircle, Plus, Calendar,
  BarChart3, Brain, TrendingUp, Zap,
} from 'lucide-react';
import ClientDashboard from './ClientDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  if (isGuestViewer(user)) return <ClientDashboard />;
  return <InternalDashboard />;
}

/* ─────────────────────────────────────────────────────────────
   Composants de base
   ───────────────────────────────────────────────────────────── */

function KpiCard({ label, value, icon: Icon, error = false, progress = null, sub = null }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border p-4 shadow-sm flex flex-col gap-2',
      error
        ? 'border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20'
        : 'border-border bg-card',
    )}>
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wider',
          error ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
        )}>
          {label}
        </span>
        {Icon && (
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            error
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
          )}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className={cn(
        'text-3xl font-bold tabular-nums tracking-tight leading-none',
        error ? 'text-red-600 dark:text-red-400' : 'text-foreground',
      )}>
        {value ?? '—'}
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {progress !== null && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-border/40">
          <div
            className={cn('h-full transition-all', error ? 'bg-red-500' : 'bg-indigo-600')}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SectionPanel({ title, icon: Icon, iconColor = 'text-indigo-600 dark:text-indigo-400', children, className, ghost }) {
  return (
    <div className={cn(
      'relative rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col overflow-hidden',
      ghost && 'bg-gradient-to-br from-card to-muted/30',
      className,
    )}>
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-5 pb-4 border-b border-border/80">
        {Icon && <Icon size={18} className={iconColor} />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function AiAlertItem({ title, sub, level = 'danger', score }) {
  const styles = level === 'danger'
    ? 'border-red-200/80 bg-red-50/60 dark:border-red-900/30 dark:bg-red-950/20'
    : 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-950/20';
  const badgeClass = level === 'danger'
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  const badge = level === 'danger' ? 'Retard critique' : 'Retard';
  return (
    <div className={cn('rounded-lg border p-3 flex gap-3 items-start', styles)}>
      <AlertTriangle size={16} className={level === 'danger' ? 'text-red-500 mt-0.5 shrink-0' : 'text-amber-500 mt-0.5 shrink-0'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold', badgeClass)}>
            {badge}
          </span>
          {score != null && (
            <span className="text-[11px] text-muted-foreground">Score risque : {score}/100</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineItem({ title, sub, date }) {
  const d = date ? new Date(date) : null;
  const month = d ? d.toLocaleDateString('fr-FR', { month: 'short' }) : '—';
  const day = d ? d.getDate() : '—';
  const isUrgent = d && (d - new Date()) < 3 * 86400000;
  return (
    <div className="flex gap-4 items-start">
      <div className={cn(
        'flex flex-col items-center justify-center w-12 h-12 rounded-lg border shrink-0',
        isUrgent
          ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
          : 'bg-muted/60 border-border',
      )}>
        <span className={cn('text-[10px] font-bold uppercase', isUrgent ? 'text-red-500' : 'text-muted-foreground')}>
          {month}
        </span>
        <span className={cn('text-sm font-bold', isUrgent ? 'text-red-600' : 'text-foreground')}>
          {day}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Project Card — Prototype Style
   ───────────────────────────────────────────────────────────── */
const PROJECT_ICON_COLORS = [
  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
  'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
];

const STATUS_BADGE = {
  active:    { label: 'Actif',         cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  planning:  { label: 'Planification', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  on_hold:   { label: 'En pause',      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  completed: { label: 'Terminé',       cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelled: { label: 'Annulé',        cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
};

function ProjectCard({ project }) {
  const progress = project.progress_percent || 0;
  const iconColor = PROJECT_ICON_COLORS[Math.abs(project.id % PROJECT_ICON_COLORS.length)];
  const isAtRisk = (project.overdue_tasks > 0) || project.status === 'on_hold';
  const statusInfo = STATUS_BADGE[project.status] || STATUS_BADGE.planning;
  const progressColor = progress >= 70 ? 'bg-emerald-500' : progress >= 35 ? 'bg-indigo-500' : 'bg-amber-400';
  const overdueCount = project.overdue_tasks_count ?? project.overdue_tasks ?? 0;

  return (
    <Link to={`/projects/${project.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={cn(
          'relative overflow-hidden rounded-xl border p-5 shadow-sm flex flex-col h-full cursor-pointer group',
          'transition-shadow duration-200 hover:shadow-md',
          isAtRisk ? 'border-red-200/70 dark:border-red-900/40' : 'border-border',
        )}
      >
        {isAtRisk && (
          <div className="pointer-events-none absolute top-0 right-0 w-16 h-16 bg-red-400/5 rounded-bl-full" />
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconColor)}>
            <FolderKanban size={20} />
          </div>
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', statusInfo.cls)}>
            {statusInfo.label}
          </span>
        </div>

        {/* Name + desc */}
        <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-4">
          {project.description || 'Aucune description.'}
        </p>

        {/* Footer */}
        <div className="mt-auto space-y-3 pt-4 border-t border-border/60">
          <div className="flex justify-between items-center">
            <span className={cn('text-xs font-medium', isAtRisk ? 'text-red-600' : 'text-muted-foreground')}>
              Progression
            </span>
            <span className={cn('text-xs font-bold tabular-nums', isAtRisk ? 'text-red-600' : 'text-foreground')}>
              {progress}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-1.5 rounded-full transition-all duration-700', isAtRisk ? 'bg-red-500' : progressColor)}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex -space-x-1.5">
              {(project.members || []).slice(0, 3).map((m) => (
                m.avatar_url ? (
                  <img key={m.id} src={m.avatar_url} alt={m.name} title={m.name}
                    className="w-6 h-6 rounded-full border-2 border-card object-cover" />
                ) : (
                  <div key={m.id} title={m.name}
                    className="w-6 h-6 rounded-full border-2 border-card bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                    {(m.name || '?')[0].toUpperCase()}
                  </div>
                )
              ))}
              {(project.members_count > 3) && (
                <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                  +{project.members_count - 3}
                </div>
              )}
            </div>
            {overdueCount > 0 ? (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle size={12} /> {overdueCount} en retard
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {project.tasks_count ?? '—'} tâches
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Premium chart primitives — inline SVG, no external lib
   ───────────────────────────────────────────────────────────── */

function DashDonut({ segments, size = 130, stroke = 17, label, sublabel, labelColor = '#6366f1' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cumAngle = 0;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="dash-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border/15" />
        {segments.map((seg, si) => {
          if (!seg.value) { cumAngle += (seg.value / total) * 360; return null; }
          const angDeg = (seg.value / total) * 360;
          const dashLen = mounted ? Math.max(0, (seg.value / total) * C - 2.5) : 0;
          const startAngle = cumAngle - 90;
          cumAngle += angDeg;
          return (
            <circle key={seg.key} cx={cx} cy={cx} r={r} fill="none"
              stroke={seg.color} strokeWidth={stroke - 2}
              strokeDasharray={`${dashLen} ${C}`} strokeLinecap="butt"
              transform={`rotate(${startAngle}, ${cx}, ${cx})`}
              style={{
                transition: 'stroke-dasharray 0.85s cubic-bezier(0.4,0,0.2,1)',
                transitionDelay: `${0.06 + si * 0.07}s`,
                filter: 'url(#dash-glow)',
              }}
            />
          );
        })}
        <circle cx={cx} cy={cx} r={r - stroke / 2 - 3} fill="none"
          stroke="currentColor" strokeWidth={0.5} className="text-border/15" strokeDasharray="2 4" />
      </svg>
      {label != null && (
        <div className="pointer-events-none absolute flex flex-col items-center gap-0.5 select-none">
          <span className="text-xl font-black tabular-nums leading-none" style={{ color: labelColor }}>{label}</span>
          {sublabel && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

function DashBarRows({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <motion.div key={item.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 + 0.08, duration: 0.28 }}
          className="flex items-center gap-3"
        >
          {item.avatar ? (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
              {item.avatar}
            </div>
          ) : (
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
          )}
          <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{item.label}</span>
          <div className="relative w-24 h-2 rounded-full bg-border/25 overflow-hidden shrink-0">
            <motion.div className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: item.color || '#6366f1' }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1], delay: idx * 0.06 + 0.12 }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-foreground w-6 text-right shrink-0">{item.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DashboardTaskBadges (kept for at-risk task cards)
   ───────────────────────────────────────────────────────────── */
function DashboardTaskBadges({ task }) {
  const wf = task.workflow_status || 'todo';
  const done = task.is_done || (task.progress_percent || 0) >= 100;
  const atRisk = wf === 'at_risk' || task.is_at_risk;
  const deps = task.dependencies;
  const depCount = Array.isArray(deps) ? deps.length : 0;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {done && <Badge className="border-emerald-200 bg-emerald-50 text-[10px] font-normal text-emerald-900">Terminé</Badge>}
      {!done && task.is_overdue && <Badge variant="destructive" className="text-[10px] font-normal">En retard</Badge>}
      {!done && !task.is_overdue && atRisk && (
        <Badge className="border-amber-200 bg-amber-100 text-[10px] font-normal text-amber-900">À risque</Badge>
      )}
      {task.is_blocked && <Badge variant="secondary" className="text-[10px] font-normal">Bloqué</Badge>}
      {depCount > 0 && (
        <Badge variant="outline" className="text-[10px] font-normal">
          Dépend de {depCount} tâche{depCount > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   InternalDashboard — main component
   ───────────────────────────────────────────────────────────── */
function InternalDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes('admin');
  const isViewerUser = isGuestViewer(user);
  const isMember = user?.roles?.includes('member') && !isAdmin;
  const usePersonalDashboardApi = !isAdmin && (isMember || isViewerUser);

  const { data: projectsPayload, isLoading: loadingProjects, isError: projectsError, error: projectsErr } = useQuery({
    queryKey: ['projects', 'dashboard'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data),
  });
  const projects = projectsPayload?.data ?? [];
  const projectsListTotal = projectsPayload?.meta?.total ?? projects.length;

  const { data: projectDashboards = [], isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboard-project-metrics', projects.map((p) => p.id)],
    enabled: projects.length > 0 && !isViewerUser,
    staleTime: 120_000,
    queryFn: async () => {
      // Batch in groups of 4 to avoid overwhelming the server
      const chunks = [];
      for (let i = 0; i < projects.length; i += 4) chunks.push(projects.slice(i, i + 4));
      const results = [];
      for (const chunk of chunks) {
        const r = await Promise.all(
          chunk.map((project) => api.get(`/projects/${project.id}/dashboard`).then((r) => ({ projectId: project.id, ...r.data }))),
        );
        results.push(...r);
      }
      return results;
    },
  });

  const { data: pendingInvites, isError: invitesError } = useQuery({
    queryKey: ['invitations-pending'],
    queryFn: fetchMyInvites,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const { data: memberDash, isLoading: loadingMemberDash, isError: memberDashError, error: memberDashErr } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: fetchMemberDashboard,
    enabled: usePersonalDashboardApi,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const { data: adminDash, isLoading: loadingAdminDash, isError: adminDashError, error: adminDashErr } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
    enabled: isAdmin,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });

  const { data: activityData, isLoading: activityLoading, isError: activityError, error: activityErr } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => fetchActivityFeed({ per_page: 10 }),
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
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || "Impossible d'accepter l'invitation."),
  });

  const declineInviteMut = useMutation({
    mutationFn: (token) => declineProjectInvite(token),
    onSuccess: () => {
      toast.message('Invitation refusée');
      queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Action impossible.'),
  });

  const { data: projectTasks = [], isLoading: loadingProjectTasks } = useQuery({
    queryKey: ['dashboard-tasks'],
    enabled: isAdmin ? true : !usePersonalDashboardApi && projects.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const res = await api.get('/tasks?all=1');
      const tasks = res.data.tasks?.data || res.data.tasks || [];
      return [{ projectId: 'all', tasks }];
    },
  });

  const awaitingMemberDash = usePersonalDashboardApi && loadingMemberDash && !memberDash && !memberDashError;
  const loadingMain = loadingProjects || (!isViewerUser && loadingDashboards) || (!usePersonalDashboardApi && loadingProjectTasks) || awaitingMemberDash;
  if (loadingMain) return <DashboardPageSkeleton showAdminColumn={isAdmin} />;

  const activeProjects = projects.filter((p) => p.status === 'active');
  const totalProjects = isAdmin && adminDash?.projects_total != null ? adminDash.projects_total : projectsListTotal;
  const flatTasks = projectTasks.flatMap((entry) => entry.tasks || []);
  const scopeTasks = isAdmin ? flatTasks : usePersonalDashboardApi ? [] : isMember ? flatTasks.filter((t) => (t.assignees || []).some((a) => (a.user?.id || a.id) === user?.id)) : flatTasks;

  const ms = memberDash?.summary;
  const totalTasks = usePersonalDashboardApi ? (ms?.total_assigned ?? 0) : isAdmin && adminDash?.tasks_total != null ? adminDash.tasks_total : scopeTasks.length;
  const completedCount = usePersonalDashboardApi ? (ms?.completed ?? 0) : isAdmin && adminDash?.tasks_completed != null ? adminDash.tasks_completed : scopeTasks.filter((t) => (t.progress_percent || 0) >= 100).length;
  const overdueCount = usePersonalDashboardApi ? (ms?.overdue_count ?? 0) : isAdmin && adminDash?.tasks_overdue != null ? adminDash.tasks_overdue : scopeTasks.filter((t) => t.is_overdue).length;
  const tasksAtRisk = usePersonalDashboardApi ? [] : scopeTasks.filter((t) => {
    const progress = t.progress_percent || 0;
    const priority = (t.priority || '').toLowerCase();
    const rl = (t.risk_level || '').toLowerCase();
    if (rl === 'high' || rl === 'medium') return true;
    return t.is_overdue || (priority === 'urgent' && progress < 60) || (priority === 'high' && progress < 40);
  });
  const tasksAtRiskList = usePersonalDashboardApi ? (memberDash?.at_risk_tasks || []) : tasksAtRisk;
  const tasksAtRiskCount = usePersonalDashboardApi ? (ms?.at_risk_count ?? tasksAtRiskList.length) : tasksAtRisk.length;
  const projectProgress = isAdmin && adminDash?.global_completion_rate_percent != null
    ? Math.round(Number(adminDash.global_completion_rate_percent))
    : projectDashboards.length > 0
      ? Math.round(projectDashboards.reduce((sum, p) => sum + (p.avg_progress || 0), 0) / projectDashboards.length)
      : 0;
  const riskyProjects = projectDashboards.filter((p) => (p.overdue_tasks || 0) > 0 || (p.avg_progress || 0) < 50);
  const aiRiskTotal = projectDashboards.reduce((s, p) => s + (p.ai_tasks_at_risk || 0), 0);

  const upcomingDeadlines = usePersonalDashboardApi
    ? (memberDash?.upcoming_deadlines || []).slice(0, 5)
    : scopeTasks.filter((t) => {
        if (!t.due_date || (t.progress_percent || 0) >= 100) return false;
        const d = new Date(t.due_date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return d >= today;
      }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);

  const activities = unwrapCollection(activityData, 'activities');

  // At-risk tasks for AI alerts panel (admin)
  const alertTasks = flatTasks
    .filter((t) => t.is_overdue || tasksAtRisk.some((x) => x.id === t.id))
    .slice(0, 4);

  const workloadPerUser = (() => {
    const map = new Map();
    flatTasks.forEach((task) => {
      (task.assignees || []).forEach((assignee) => {
        const u = assignee.user || assignee;
        if (!u?.id) return;
        const current = map.get(u.id) || { id: u.id, name: u.name || 'Utilisateur', count: 0 };
        current.count += 1;
        map.set(u.id, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  // Chart data derived from already-fetched lists
  const projectsByStatus = {
    active: projects.filter((p) => p.status === 'active').length,
    planning: projects.filter((p) => !p.status || p.status === 'planning').length,
    on_hold: projects.filter((p) => p.status === 'on_hold').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };
  const chartTasks = isAdmin ? flatTasks : scopeTasks;
  const tasksByWorkflow = {
    done: chartTasks.filter((t) => t.workflow_status === 'done' || (t.progress_percent || 0) >= 100).length,
    in_progress: chartTasks.filter((t) => t.workflow_status === 'in_progress').length,
    todo: chartTasks.filter((t) => !t.workflow_status || t.workflow_status === 'todo').length,
    at_risk: chartTasks.filter((t) => t.workflow_status === 'at_risk' || (t.is_overdue && t.workflow_status !== 'done')).length,
  };
  const tasksByPriority = {
    urgent: chartTasks.filter((t) => t.priority === 'urgent').length,
    high: chartTasks.filter((t) => t.priority === 'high').length,
    medium: chartTasks.filter((t) => t.priority === 'medium').length,
    low: chartTasks.filter((t) => t.priority === 'low').length,
  };
  const showCharts = isAdmin ? flatTasks.length > 0 || projects.length > 0 : chartTasks.length > 0 || (usePersonalDashboardApi && totalTasks > 0);

  const hasErrors = projectsError || memberDashError || adminDashError || (!isViewerUser && activityError) || invitesError;

  /* ─── RENDER ─── */
  return (
    <div className="space-y-6">
      {/* Error banner */}
      {hasErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/40 px-4 py-3 text-sm text-red-900 dark:text-red-100 space-y-1">
          {projectsError && <p>Projets : {projectsErr?.message || 'Impossible de charger la liste des projets.'}</p>}
          {memberDashError && <p>Tableau personnel : {memberDashErr?.message || 'Erreur API.'}</p>}
          {adminDashError && <p>Tableau admin : {adminDashErr?.message || 'Erreur API.'}</p>}
          {!isViewerUser && activityError && <p>Activité : {activityErr?.message || 'Erreur API.'}</p>}
          {invitesError && <p>Invitations : erreur de chargement.</p>}
        </div>
      )}

      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500/70 dark:text-indigo-400/60 mb-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bonjour, {user?.name} 👋
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            {isAdmin
              ? 'Supervision globale de vos projets et équipes.'
              : isMember
                ? 'Vos projets actifs, tâches assignées et prochaines échéances.'
                : 'Vos tâches assignées et les projets auxquels vous participez.'}
          </p>
        </div>

      </div>

      {/* ── Invitations banner ── */}
      {pendingInvites?.pending_count > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-amber-600 shrink-0" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Invitations en attente
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold px-2 py-0.5">
                {pendingInvites.pending_count}
              </span>
            </h3>
          </div>
          {pendingInvites.invitations?.map((inv) => (
            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-100 bg-white/70 dark:bg-slate-900/60 dark:border-amber-900/40 p-3">
              <div>
                <p className="font-semibold text-sm text-foreground">{inv.project?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Rôle : {inv.role === 'client' || inv.role === 'guest' ? PROJECT_ROLE_LABELS.client : PROJECT_ROLE_LABELS.member}
                  {inv.invited_by?.name ? ` · Invité par ${inv.invited_by.name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" type="button" disabled={acceptInviteMut.isPending || declineInviteMut.isPending} onClick={() => acceptInviteMut.mutate(inv.token)}>
                  Accepter
                </Button>
                <Button size="sm" type="button" variant="outline" disabled={acceptInviteMut.isPending || declineInviteMut.isPending} onClick={() => declineInviteMut.mutate(inv.token)}>
                  <XCircle className="mr-1 h-4 w-4" /> Refuser
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Row ── */}
      {isAdmin ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {loadingAdminDash && !adminDash ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <KpiCard label="Utilisateurs" value={adminDash?.users_total ?? 0} icon={Users} />
              <KpiCard label="Projets" value={adminDash?.projects_total ?? 0} icon={FolderKanban} sub={`${activeProjects.length} actifs`} />
              <KpiCard label="Tâches" value={adminDash?.tasks_total ?? 0} icon={ListTodo} sub={`${completedCount} terminées`} />
              <KpiCard label="Complétion" value={`${projectProgress}%`} icon={TrendingUp} progress={projectProgress} />
              <KpiCard label="En Retard" value={adminDash?.tasks_overdue ?? 0} icon={AlertTriangle} error />
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Mes Projets" value={totalProjects} icon={FolderKanban} sub={`${activeProjects.length} actifs`} />
          <KpiCard label="Mes Tâches" value={totalTasks} icon={ListTodo} sub={`${completedCount} terminées`} />
          <KpiCard label="Progression" value={`${projectProgress}%`} icon={TrendingUp} progress={projectProgress} />
          <KpiCard label="À Risque" value={overdueCount} icon={AlertTriangle} error={overdueCount > 0} />
        </div>
      )}

      {/* ── Bento Grid (3 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Panel 1 : Détails globaux / Charge membre */}
        <SectionPanel title={isAdmin ? 'Détails globaux' : 'Ma charge de travail'} icon={BarChart3}>
          <div className="space-y-3 flex-1">
            {isAdmin ? (
              <>
                <DetailRow label="Projets totaux" value={`${adminDash?.projects_total ?? totalProjects}`} sub={`${activeProjects.length} actifs`} />
                <DetailRow label="Tâches totales" value={`${adminDash?.tasks_total ?? totalTasks}`} sub={`${completedCount} terminées`} />
                <DetailRow label="Progression" value={`${projectProgress}%`} />
                <DetailRow label="Taux complétion" value={`${adminDash?.global_completion_rate_percent ?? projectProgress}%`} />
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <DetailRow label="Tâches en retard" value={adminDash?.tasks_overdue ?? overdueCount} error />
                  <DetailRow label="Projets à risque" value={riskyProjects.length} error={riskyProjects.length > 0} />
                  {aiRiskTotal > 0 && <DetailRow label="Risques IA détectés" value={aiRiskTotal} error />}
                </div>
                <div className="pt-3 border-t border-border/60">
                  <Link to="/ai" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
                    Ouvrir IA &amp; Analytics <ArrowRight size={12} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <DetailRow label="Tâches assignées" value={totalTasks} />
                <DetailRow label="Terminées" value={completedCount} />
                <DetailRow label="En cours" value={ms?.in_progress ?? 0} />
                <DetailRow label="À faire" value={ms?.todo ?? 0} />
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <DetailRow label="En retard" value={overdueCount} error={overdueCount > 0} />
                  <DetailRow label="À risque" value={tasksAtRiskCount} error={tasksAtRiskCount > 0} />
                  {ms?.blocked_count > 0 && <DetailRow label="Bloquées" value={ms.blocked_count} error />}
                </div>
                {ms?.workload_percent != null && (
                  <div className="pt-3 border-t border-border/60 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Charge relative</span>
                      <span className="font-semibold text-foreground">{ms.workload_percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${ms.workload_percent}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SectionPanel>

        {/* Panel 2 : Alertes IA (admin) / Activité récente (member) */}
        <SectionPanel
          title={isAdmin ? 'Alertes IA' : 'Activité récente'}
          icon={isAdmin ? Brain : History}
          iconColor={isAdmin ? 'text-violet-500' : 'text-indigo-500'}
          ghost
        >
          {isAdmin ? (
            <>
              <div className="pointer-events-none absolute top-4 right-4 opacity-[0.06]">
                <Brain size={72} />
              </div>
              <div className="space-y-3 relative z-10">
                {alertTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune alerte pour le moment.</p>
                ) : alertTasks.map((t) => {
                  const pname = projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
                  const score = t.risk_score != null ? t.risk_score
                    : t.is_overdue ? 88
                    : (t.priority === 'urgent') ? 75
                    : 62;
                  return (
                    <Link key={t.id} to={`/projects/${t.project_id}?highlightTask=${t.id}`}>
                      <AiAlertItem
                        title={t.title}
                        sub={pname}
                        level={t.is_overdue ? 'danger' : 'warning'}
                        score={score}
                      />
                    </Link>
                  );
                })}
                {riskyProjects.slice(0, 2).map((rp) => {
                  const pname = projects?.find((p) => p.id === rp.projectId)?.name || `Projet #${rp.projectId}`;
                  if (alertTasks.length >= 4) return null;
                  return (
                    <Link key={rp.projectId} to={`/projects/${rp.projectId}`}>
                      <AiAlertItem title={pname} sub={`${rp.overdue_tasks || 0} tâche(s) en retard · ${Math.round(rp.avg_progress || 0)}% avancement`} level="warning" />
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {activityLoading && activities.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded bg-muted w-3/4" />
                      <div className="h-2.5 rounded bg-muted w-1/2" />
                    </div>
                  </div>
                ))
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune activité récente.</p>
              ) : activities.slice(0, 5).map((a, idx) => {
                const { line, quote } = humanizeActivityLine(a, user);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex gap-2.5 items-start"
                  >
                    <UserAvatar name={a.actor?.name || 'Membre'} src={a.actor?.avatar_url} size="sm" className="shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">
                        {line}{quote && <span className="font-semibold"> {quote}</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.created_at ? formatRelativeTimeFr(a.created_at) : ''}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </SectionPanel>

        {/* Panel 3 : Prochaines échéances */}
        <SectionPanel title="Prochaines échéances" icon={Calendar} iconColor="text-indigo-600 dark:text-indigo-400">
          <div className="space-y-4 flex-1">
            {upcomingDeadlines.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>
              </div>
            ) : upcomingDeadlines.map((t) => {
              const pname = t.project_name || projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
              return (
                <Link key={t.id} to={`/projects/${t.project_id}?highlightTask=${t.id}`}>
                  <DeadlineItem
                    title={t.title}
                    sub={pname}
                    date={t.due_date || t.effective_end_date}
                  />
                </Link>
              );
            })}
            {upcomingDeadlines.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <Link to="/calendar" className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1">
                  Voir le calendrier <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </SectionPanel>
      </div>

      {/* ── Analytics Charts ── */}
      {showCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Chart 1: Distribution donut — projects (admin) or tasks (member) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-foreground leading-none">
              {isAdmin ? 'Projets par statut' : 'Mes tâches'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-5">Distribution actuelle</p>
            <div className="flex items-center gap-5">
              {isAdmin ? (
                <DashDonut size={128} stroke={17}
                  label={projects.length} sublabel="Projets" labelColor="#6366f1"
                  segments={[
                    { key: 'active', value: projectsByStatus.active, color: '#22c55e' },
                    { key: 'planning', value: projectsByStatus.planning, color: '#94a3b8' },
                    { key: 'on_hold', value: projectsByStatus.on_hold, color: '#f59e0b' },
                    { key: 'completed', value: projectsByStatus.completed, color: '#6366f1' },
                  ]}
                />
              ) : (
                <DashDonut size={128} stroke={17}
                  label={`${totalTasks > 0 ? Math.round((tasksByWorkflow.done / Math.max(1, totalTasks)) * 100) : 0}%`}
                  sublabel="Terminé"
                  labelColor={tasksByWorkflow.done / Math.max(1, totalTasks) >= 0.75 ? '#22c55e' : '#f59e0b'}
                  segments={[
                    { key: 'done', value: tasksByWorkflow.done, color: '#22c55e' },
                    { key: 'in_progress', value: tasksByWorkflow.in_progress, color: '#f59e0b' },
                    { key: 'todo', value: tasksByWorkflow.todo, color: '#94a3b8' },
                    { key: 'at_risk', value: tasksByWorkflow.at_risk, color: '#ef4444' },
                  ]}
                />
              )}
              <div className="space-y-2.5 flex-1 min-w-0">
                {(isAdmin ? [
                  { label: 'Actifs', value: projectsByStatus.active, color: '#22c55e' },
                  { label: 'Planification', value: projectsByStatus.planning, color: '#94a3b8' },
                  { label: 'En pause', value: projectsByStatus.on_hold, color: '#f59e0b' },
                  { label: 'Terminés', value: projectsByStatus.completed, color: '#6366f1' },
                ] : [
                  { label: 'Terminées', value: tasksByWorkflow.done, color: '#22c55e' },
                  { label: 'En cours', value: tasksByWorkflow.in_progress, color: '#f59e0b' },
                  { label: 'À faire', value: tasksByWorkflow.todo, color: '#94a3b8' },
                  { label: 'À risque', value: tasksByWorkflow.at_risk, color: '#ef4444' },
                ]).map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground truncate flex-1">{s.label}</span>
                    <span className="text-xs font-bold tabular-nums text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Chart 2: Team workload (admin) or Priority breakdown (member) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-foreground leading-none">
              {isAdmin ? 'Charge des équipes' : 'Priorités'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-5">
              {isAdmin ? 'Tâches assignées par membre' : 'Répartition par niveau d\'urgence'}
            </p>
            {isAdmin ? (
              <DashBarRows items={workloadPerUser.map((u) => ({
                label: u.name,
                value: u.count,
                color: '#6366f1',
                avatar: (u.name || '?')[0].toUpperCase(),
              }))} />
            ) : (
              <DashBarRows items={[
                { label: 'Urgente', value: tasksByPriority.urgent, color: '#ef4444' },
                { label: 'Haute', value: tasksByPriority.high, color: '#f97316' },
                { label: 'Moyenne', value: tasksByPriority.medium, color: '#f59e0b' },
                { label: 'Basse', value: tasksByPriority.low, color: '#3b82f6' },
              ].filter((i) => i.value > 0)} />
            )}
          </motion.div>

          {/* Chart 3: Project progress bars (admin) or health metrics (member) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className={cn(
              'rounded-2xl border border-border p-6 shadow-sm bg-gradient-to-br',
              isAdmin
                ? 'from-indigo-50/40 via-card to-card dark:from-indigo-950/20'
                : 'from-violet-50/40 via-card to-card dark:from-violet-950/20',
            )}
          >
            <h3 className="text-sm font-semibold text-foreground leading-none">
              {isAdmin ? 'Avancement par projet' : 'Vue d\'ensemble'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-5">
              {isAdmin ? 'Top projets actifs' : 'Métriques de progression'}
            </p>
            {isAdmin ? (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map((p, pi) => {
                  const pd = projectDashboards.find((d) => d.projectId === p.id);
                  const prog = Math.round(pd?.avg_progress ?? p.progress_percent ?? 0);
                  const progColor = prog >= 70 ? '#22c55e' : prog >= 40 ? '#6366f1' : '#f59e0b';
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: pi * 0.06 + 0.18, duration: 0.28 }}
                        className="hover:bg-muted/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-foreground truncate max-w-[150px]">{p.name}</span>
                          <span className="text-xs font-bold tabular-nums shrink-0 ml-2" style={{ color: progColor }}>{prog}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border/25 overflow-hidden">
                          <motion.div className="h-1.5 rounded-full" style={{ background: progColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, prog)}%` }}
                            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1], delay: pi * 0.06 + 0.22 }}
                          />
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
                {activeProjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun projet actif.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: 'Taux de complétion',
                    value: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
                    max: 100, color: '#22c55e', suffix: '%',
                  },
                  {
                    label: 'Tâches à risque',
                    value: tasksAtRiskCount,
                    max: Math.max(1, totalTasks), color: '#ef4444', suffix: '',
                  },
                  {
                    label: 'Projets actifs',
                    value: activeProjects.length,
                    max: Math.max(1, totalProjects), color: '#6366f1', suffix: '',
                  },
                ].map((metric, mi) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: metric.color }}>
                        {metric.value}{metric.suffix}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-border/25 overflow-hidden">
                      <motion.div className="h-2 rounded-full" style={{ background: metric.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(metric.value / metric.max) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: mi * 0.1 + 0.15 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Member: tâches à risque ── */}
      {!isAdmin && !isViewerUser && tasksAtRiskList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Mes tâches en retard ou à risque
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasksAtRiskList.slice(0, 6).map((t) => {
              const pname = t.project_name || projects?.find((p) => p.id === t.project_id)?.name || `Projet #${t.project_id}`;
              return (
                <Link key={t.id} to={`/projects/${t.project_id}?highlightTask=${t.id}`}>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-amber-200/80 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <Badge variant={t.is_overdue ? 'destructive' : 'outline'} className="shrink-0 text-[10px]">
                        {t.is_overdue ? 'En retard' : 'À risque'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{pname}</p>
                    {(t.due_date || t.effective_end_date) && (
                      <p className="text-xs text-muted-foreground">
                        Échéance : {new Date(t.due_date || t.effective_end_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Projects Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">
            {isAdmin ? 'Tous les projets' : 'Mes projets'}
          </h2>
          <Link to="/projects" className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Aucun projet pour l'instant"
            description="Créez un projet pour organiser vos tâches et inviter votre équipe."
          >
            <Link to="/projects" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Nouveau projet
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.slice(0, 8).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Petit helper : ligne dans le panel "Détails globaux"
   ───────────────────────────────────────────────────────────── */
function DetailRow({ label, value, sub, error = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn('text-sm', error ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className={cn('text-sm font-semibold tabular-nums', error ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
        {value}
        {sub && <span className="text-xs font-normal text-muted-foreground ml-1">({sub})</span>}
      </span>
    </div>
  );
}
