import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
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
    queryKey: ['dashboard-project-tasks', projects?.map((p) => p.id)],
    enabled: !!projects?.length,
    queryFn: async () => {
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
  const totalTasks = flatTasks.length;
  const completedTasks = flatTasks.filter((t) => (t.progress_percent || 0) >= 100);
  const overdueTasks = flatTasks.filter((t) => t.is_overdue);
  const tasksAtRisk = flatTasks.filter((t) => {
    const progress = t.progress_percent || 0;
    const priority = (t.priority || '').toLowerCase();
    return t.is_overdue || (priority === 'urgent' && progress < 60) || (priority === 'high' && progress < 40);
  });
  const projectProgress = projectDashboards.length
    ? Math.round(projectDashboards.reduce((sum, p) => sum + (p.avg_progress || 0), 0) / projectDashboards.length)
    : 0;

  const costTracking = projectDashboards.reduce(
    (acc, p) => {
      acc.estimated += Number(p.estimated_cost || 0);
      acc.actual += Number(p.actual_cost || 0);
      return acc;
    },
    { estimated: 0, actual: 0 },
  );

  const workloadPerUser = (() => {
    const map = new Map();
    flatTasks.forEach((task) => {
      (task.assignees || []).forEach((assignee) => {
        const user = assignee.user || assignee;
        if (!user?.id) return;
        const current = map.get(user.id) || { id: user.id, name: user.name || 'User', count: 0 };
        current.count += 1;
        map.set(user.id, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  const statusDistribution = [
    { label: 'Completed', value: completedTasks.length, color: '#10b981' },
    { label: 'At risk', value: tasksAtRisk.length, color: '#f59e0b' },
    { label: 'Overdue', value: overdueTasks.length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.name} 👋</h1>
            <p className="text-sm text-muted-foreground">Vue d'ensemble moderne de vos projets, risques et coûts</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm">
            <Sparkles size={14} />
            Dashboard intelligent
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Projets totaux"
          value={totalProjects}
          sub={`${activeProjects.length} actifs`}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={ListTodo}
          label="Tâches totales"
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
          label="Tâches à risque"
          value={tasksAtRisk.length}
          sub={`${overdueTasks.length} en retard`}
          color={tasksAtRisk.length > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workload per user (bar chart)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workloadPerUser.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune affectation trouvée</p>
            ) : workloadPerUser.map((entry) => {
              const max = Math.max(...workloadPerUser.map((u) => u.count), 1);
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
            <CardTitle className="text-base">Tasks distribution (pie chart)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={statusDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cost tracking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Estimated cost" value={`${Math.round(costTracking.estimated).toLocaleString()} MAD`} />
          <MiniMetric label="Actual cost" value={`${Math.round(costTracking.actual).toLocaleString()} MAD`} />
          <MiniMetric
            label="Variance"
            value={`${Math.round(costTracking.actual - costTracking.estimated).toLocaleString()} MAD`}
            tone={costTracking.actual > costTracking.estimated ? 'text-red-600' : 'text-emerald-600'}
          />
        </CardContent>
      </Card>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mes projets</h2>
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

function MiniMetric({ label, value, tone }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone || 'text-foreground'}`}>{value}</p>
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
