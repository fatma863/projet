import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { DueDateRangeFilter } from '../../components/tasks/DueDateRangeFilter';
import { WORKFLOW_COLUMNS, ISSUE_TYPE_LABELS } from '../../lib/taskConstants';
import { isGuestViewer } from '../../lib/roles';
import {
  ArrowLeft, Plus, GripVertical, Clock, User, AlertTriangle,
  BarChart3, Users, Calendar, Mail, Download, History,
  Pencil, Trash2, LayoutGrid, MessageSquare, Link2, FolderKanban, Crown, TrendingUp,
  UserMinus,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import GanttChart from '../../components/gantt/GanttChart';
import {
  getActivityHeadline,
  getActivityDetailRows,
  getActivityIconName,
  workflowBadgeClass,
  priorityBadgeClass,
} from '../../lib/projectActivityHumanize';
import { toast } from 'sonner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import DailyProgressModal from '../../components/tasks/DailyProgressModal';
import FollowerButton from '../../components/projects/FollowerButton';
import ProjectPauseButton from '../../components/projects/ProjectPauseButton';
import ProjectPauseBanner from '../../components/projects/ProjectPauseBanner';
import { useProjectPause } from '../../hooks/useProjectPause';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS_FR = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

function formatEstMinutes(m) {
  if (m == null || m === '') return '';
  const n = Number(m);
  if (Number.isNaN(n)) return '';
  const h = Math.floor(n / 60);
  const min = Math.round(n % 60);
  if (h && min) return `${h}h${min}`;
  if (h) return `${h}h`;
  return `${min}min`;
}

const STATUS_LABELS = {
  planning: 'Planification',
  active: 'Actif',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

function normalizeWorkflowStatus(raw) {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'done' || normalized === 'completed' || normalized === 'termine') return 'done';
  if (normalized === 'in_progress' || normalized === 'at_risk' || normalized === 'en cours') return 'in_progress';
  if (normalized === 'a faire' || normalized === 'todo' || normalized === 'to do') return 'todo';
  return 'todo';
}

function getTaskStatus(task) {
  const statusValue = task?.status;
  const statusFromObject = statusValue && typeof statusValue === 'object' ? statusValue.name : statusValue;
  return (
    statusFromObject
    || task?.workflow_status
    || task?.state
    || task?.etat
    || 'todo'
  );
}

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const isAdmin  = user?.roles?.includes('admin');
  const isClient = user?.roles?.includes('client');
  const isViewer = isGuestViewer(user);
  const isMember = !isAdmin && !isViewer;

  const openNewTask  = (workflow = 'todo') => navigate(`/projects/${id}/tasks/new?workflow=${workflow}`);
  const openEditTask = (task) => navigate(`/projects/${id}/tasks/${task.id}/edit`);
  const [kanbanFilters, setKanbanFilters] = useState(() => ({
    user: isMember && user?.id ? String(user.id) : '',
    priority: '', type: '', workflow: '', due_from: '', due_to: '',
  }));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState('kanban');
  const [worklogTask, setWorklogTask] = useState(null);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () =>
      api.get(`/projects/${id}`).then((r) => (
        r.data?.data ?? r.data?.project ?? r.data
      )),
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', id],
    queryFn: () => api.get(`/projects/${id}/statuses`).then((r) => (
      r.data?.statuses?.data ?? r.data?.statuses ?? r.data?.data ?? []
    )),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const projectId = Number(id);
      const normalizeList = (rawTasks) => {
        const normalized = (Array.isArray(rawTasks) ? rawTasks : [])
          .filter((t) => {
            // Endpoint déjà scoped projet; si project_id absent/null dans payload, on ne jette pas la tâche.
            if (t?.project_id == null || t?.project_id === '') return true;
            return Number(t.project_id) === Number(projectId);
          })
          .map((t) => ({
            ...t,
            // Priorité à workflow_status (valeur canonique du backend) ; fallback sur le nom du statut Kanban.
            workflow_status: t.workflow_status
              ? normalizeWorkflowStatus(t.workflow_status)
              : normalizeWorkflowStatus(getTaskStatus(t)),
          }));


        return normalized;
      };

      try {
        const r = await api.get(`/projects/${id}/tasks?all=1`);
        const rawTasks = r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? [];
        const primary = normalizeList(rawTasks);
        if (primary.length > 0) {
          return primary;
        }

      } catch {
        // fallback vers l'endpoint global
      }

      // Fallback défensif: endpoint global filtré par projet.
      const g = await api.get(`/tasks?all=1&project_id=${projectId}`);
      const globalRaw = g.data?.tasks?.data ?? g.data?.tasks ?? g.data?.data ?? [];
      return normalizeList(globalRaw);
    },
  });

  useEffect(() => {
    const highlight = searchParams.get('highlightTask');
    if (!highlight || !tasks?.length) return;
    const tid = Number(highlight, 10);
    if (Number.isNaN(tid)) return;
    const found = tasks.find((t) => t.id === tid);
    if (found) {
      const next = new URLSearchParams(searchParams);
      next.delete('highlightTask');
      setSearchParams(next, { replace: true });
      navigate(`/projects/${id}/tasks/${found.id}/edit`);
    }
  }, [tasks, searchParams, setSearchParams]);


  const { data: dashboard } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data),
    enabled: Boolean(id) && tab === 'progress',
    staleTime: 60_000,
  });

  const { data: criticalPath } = useQuery({
    queryKey: ['project-critical-path', id],
    queryFn: () => api.get(`/projects/${id}/critical-path`).then((r) => r.data),
    enabled: Boolean(id) && tab === 'progress',
    staleTime: 60_000,
  });
  const { data: ganttData, isLoading: loadingGantt } = useQuery({
    queryKey: ['project-gantt', id],
    // Clients have read-only access to the full project Gantt; only true guests (viewer/guest role) are blocked
    enabled: (!isViewer || isClient) && tab === 'gantt',
    queryFn: () => api.get(`/projects/${id}/gantt`).then((r) => (
      r.data?.gantt ?? r.data?.data?.gantt ?? r.data?.data ?? []
    )),
    staleTime: 60_000,
  });

  const access = project?.access ?? {};
  /** Création de tâches / Kanban (hors invité projet). */
  const canWriteProject = isAdmin || Boolean(access.can_create_tasks);
  /** Paramètres projet, membres (admin projet ou admin app). */
  const canEditProject = isAdmin || Boolean(access.can_edit);
  /** Invitation par e-mail (admin projet ou admin app). */
  const canInvite = isAdmin || Boolean(access.can_invite);

  // ── Pause / Resume ──────────────────────────────────────────────────────
  const isPaused   = project?.is_paused || project?.status === 'on_hold';
  /** When paused, ALL write actions are blocked regardless of role */
  const isReadOnly = isPaused;
  const { resume, isResuming } = useProjectPause(id);

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(`project.${id}`);

    channel.listen('.task.comment.created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    });

    channel.listen('.task.comment.deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    });

    channel.listen('.task.updated', (e) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      if (e.action === 'moved') {
        // Kanban move — also refresh dashboard metrics
        queryClient.invalidateQueries({ queryKey: ['project-dashboard', id] });
      }
    });

    channel.listen('.task.deleted', (e) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', id] });
      toast.info(`Tâche "${e.task_title}" supprimée par ${e.actor_name}`);
    });

    channel.listen('.task.assignment.changed', (e) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    });

    channel.listen('.activity.logged', () => {
      queryClient.invalidateQueries({ queryKey: ['project-activity', id] });
    });

    channel.listen('.sprint.state.changed', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    });

    // Project pause / resume — broadcast by ProjectStatusChanged event
    channel.listen('.project.status.changed', (e) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (e.action === 'paused') {
        toast.warning(`⏸️ Projet mis en pause par ${e.actor_name}`, {
          description: e.pause_reason || '',
          duration: 6000,
        });
      } else if (e.action === 'resumed') {
        toast.success(`▶️ Projet repris par ${e.actor_name}`, { duration: 5000 });
      }
    });

    channel.listen('.progress.updated', (e) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', id] });
      if (e.source === 'worklog' && e.actor_id !== user?.id) {
        toast.info(`${e.actor_name} a mis à jour la progression de "${e.task_title}" → ${e.task_progress}%`);
      }
    });

    return () => {
      echo.leave(`private-project.${id}`);
    };
  }, [id, queryClient, user?.id]);

  const workflowMoveMutation = useMutation({
    mutationFn: ({ taskId, workflow_status }) =>
      api.put(`/tasks/${taskId}`, { workflow_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
    onError: (err) => {
      const errs = err?.response?.data?.errors;
      const msg = errs
        ? Object.values(errs).flat().join(' ')
        : (err?.response?.data?.message || err?.message || 'Impossible de déplacer la tâche.');
      toast.error(msg);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', id] });
      toast.success('Tâche supprimée');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la suppression'),
  });

  const filteredTasks = useMemo(() => {
    let list = tasks || [];
    const hasDueFrom = Boolean((kanbanFilters.due_from || '').trim());
    const hasDueTo = Boolean((kanbanFilters.due_to || '').trim());

    // Aucun filtre actif => retourner toutes les tâches du projet.
    if (
      !kanbanFilters.user
      && !kanbanFilters.priority
      && !kanbanFilters.type
      && !kanbanFilters.workflow
      && !hasDueFrom
      && !hasDueTo
    ) {
      return list;
    }

    if (kanbanFilters.user) {
      const uid = Number(kanbanFilters.user);
      list = list.filter((t) => (t.assignees || []).some((a) => Number(a.id) === uid));
    }
    if (kanbanFilters.priority) {
      list = list.filter((t) => t.priority === kanbanFilters.priority);
    }
    if (kanbanFilters.type) {
      list = list.filter((t) => (t.issue_type || t.type || 'task') === kanbanFilters.type);
    }
    if (kanbanFilters.workflow) {
      list = list.filter((t) => t.workflow_status === kanbanFilters.workflow);
    }
    if (hasDueFrom) {
      list = list.filter((t) => {
        const d = t.due_date || t.planned_end;
        return d && d >= kanbanFilters.due_from;
      });
    }
    if (hasDueTo) {
      list = list.filter((t) => {
        const d = t.due_date || t.planned_end;
        return d && d <= kanbanFilters.due_to;
      });
    }
    return list;
  }, [tasks, kanbanFilters]);

  const assigneeFilterOptions = useMemo(() => {
    const m = new Map();
    (tasks || []).forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const uid = a.id;
        if (uid && !m.has(uid)) m.set(uid, a.name || '?');
      });
    });
    return [...m.entries()].map(([uid, name]) => ({ id: uid, name }));
  }, [tasks]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!project) {
    const status = error?.response?.status;
    if (status === 403) {
      return <div className="py-20 text-center text-muted-foreground">Accès refusé</div>;
    }
    return <div className="py-20 text-center text-muted-foreground">Projet non trouvé</div>;
  }

  const tasksByWorkflow = (columnId) =>
    filteredTasks
      .filter((t) => t.workflow_status === columnId)
      .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

  const handleDrop = (e, workflow) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.warning('⏸️ Ce projet est en pause. Les modifications sont désactivées.');
      return;
    }
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!taskId) return;
    workflowMoveMutation.mutate({ taskId, workflow_status: workflow });
  };

  const handleDragOver = (e) => {
    if (isReadOnly) return; // disable hover feedback when paused
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/projects" className="mt-1 rounded-md p-1 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                {project.code}
              </span>
              <Badge variant={project.status === 'active' ? 'success' : project.status === 'on_hold' ? 'warning' : 'secondary'}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              {isPaused && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700">
                  ⏸️ En pause
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canInvite && !isReadOnly && (
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Inviter
            </Button>
          )}
          <FollowerButton projectId={id} />
          {(isAdmin || !isViewer) && (
            <Link
              to={`/projects/${id}/members-performance`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <BarChart3 className="h-4 w-4 text-primary" /> Performance
            </Link>
          )}
          {/* Pause / Resume button — visible to users with the right permission */}
          <ProjectPauseButton project={project} projectId={id} />
        </div>
      </div>

      {/* ── Project Pause Banner (highest priority) ───────────────────────── */}
      {isPaused && (
        <ProjectPauseBanner
          project={project}
          onResume={project?.can_resume ? resume : undefined}
          isResuming={isResuming}
        />
      )}

      {!isPaused && !canWriteProject && (
        <div className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Lecture seule.</strong>{' '}
          {access.is_client
            ? 'Rôle client sur ce projet : consultation des tâches et commentaires uniquement.'
            : 'Vous consultez ce projet sans droits de modification sur les tâches.'}
        </div>
      )}

      {/* Stats bar */}
      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Total tâches" value={dashboard.total_tasks} />
          <MiniStat label="Terminées" value={dashboard.completed_tasks} />
          <MiniStat label="En retard" value={dashboard.overdue_tasks} color="text-destructive" />
          <MiniStat label="Avancement" value={`${dashboard.avg_progress || 0}%`} />
        </div>
      )}

      {/* Chemin critique (CPM) — uniquement si des tâches ont une date de début planifiée */}
      {criticalPath?.schedule_ready && (
        <Card className="border-red-200/80 bg-gradient-to-br from-red-50/50 to-transparent">
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                <h3 className="text-base font-semibold text-foreground">Chemin critique</h3>
              </div>
              {criticalPath.graph_valid && (
                <Badge variant="outline" className="font-mono text-xs">
                  Durée projet (CPM) : {Number(criticalPath.total_duration ?? 0).toLocaleString('fr-FR')} j
                </Badge>
              )}
            </div>
            {!criticalPath.graph_valid && criticalPath.message && (
              <p className="text-sm text-amber-800">{criticalPath.message}</p>
            )}
            {criticalPath.graph_valid && criticalPath.message && !criticalPath.critical_tasks?.length && (
              <p className="text-sm text-muted-foreground">{criticalPath.message}</p>
            )}
            {criticalPath.graph_valid && criticalPath.critical_tasks?.length > 0 && (
              <ul className="space-y-2">
                {criticalPath.critical_tasks.map((ct) => (
                  <li
                    key={ct.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100 bg-white/80 px-3 py-2 text-sm dark:border-red-900/50 dark:bg-red-950/40"
                  >
                    <span className="font-medium text-foreground">{ct.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ES {ct.es} → EF {ct.ef}
                      {ct.planned_start && ` · ${ct.planned_start}`}
                      {ct.is_delayed && (
                        <Badge variant="destructive" className="ml-2">Retard</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {criticalPath.graph_valid &&
              criticalPath.critical_tasks?.some((c) => c.is_delayed) && (
                <p className="mt-3 flex items-center gap-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Au moins une tâche critique est en retard : la date de fin du projet est à risque.
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'kanban', label: 'Kanban' },
          { key: 'members', label: 'Membres' },
          { key: 'activity', label: 'Historique' },
          ...(!isViewer || isClient ? [{ key: 'gantt', label: 'Gantt' }] : []),
          { key: 'progress', label: "Rapport d'avancement" },
          ...(isViewer ? [{ key: 'reports', label: 'Rapports IA' }] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'kanban' && (
        <div className="space-y-4">
          {Array.isArray(tasks) && tasks.length === 0 && (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Aucune tâche récupérée pour ce projet. Vérifiez les permissions API et la réponse réseau
              <span className="font-mono"> /projects/{id}/tasks </span>
              (un fallback via
              <span className="font-mono"> /tasks?project_id={id} </span>
              est déjà appliqué).
            </div>
          )}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
            
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Workflow</label>
              <Select
                value={kanbanFilters.workflow}
                onChange={(e) => setKanbanFilters((f) => ({ ...f, workflow: e.target.value }))}
                className="min-w-[140px]"
              >
                <option value="">Tous</option>
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Priorité</label>
              <Select
                value={kanbanFilters.priority}
                onChange={(e) => setKanbanFilters((f) => ({ ...f, priority: e.target.value }))}
                className="min-w-[120px]"
              >
                <option value="">Toutes</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div className="w-full min-w-0 sm:min-w-[min(100%,22rem)] sm:max-w-md">
              <DueDateRangeFilter
                idPrefix={`kanban-${id}-due`}
                value={{ due_from: kanbanFilters.due_from, due_to: kanbanFilters.due_to }}
                onChange={(v) => setKanbanFilters((f) => ({ ...f, due_from: v.due_from, due_to: v.due_to }))}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKanbanFilters({
                user: isMember && user?.id ? String(user.id) : '',
                priority: '', type: '', workflow: '', due_from: '', due_to: '',
              })}
            >
              Réinitialiser les filtres
            </Button>
          </div>
          <KanbanBoard
            columns={WORKFLOW_COLUMNS}
            tasksByWorkflow={tasksByWorkflow}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onAddTask={isReadOnly ? null : (wf) => openNewTask(wf)}
            onEditTask={isReadOnly ? null : (task) => openEditTask(task)}
            onDeleteTask={isReadOnly ? null : (task) => {
              if (window.confirm(`Supprimer "${task.title}" ? Cette action est irréversible.`)) {
                deleteTaskMutation.mutate(task.id);
              }
            }}
            onLogWork={!isViewer && !isReadOnly ? (task) => setWorklogTask(task) : null}
            canWriteProject={canWriteProject && !isReadOnly}
            isAdmin={isAdmin}
            movePending={workflowMoveMutation.isPending}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {tab === 'members' && (
        <MembersTab project={project} projectId={id} canEditProject={canEditProject} canInvite={canInvite} isAdmin={isAdmin} onOpenInvite={() => setInviteOpen(true)} />
      )}
      {tab === 'activity' && <ProjectActivityTab projectId={id} />}
      {tab === 'gantt' && (
        <div className="pt-4">
          {loadingGantt ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : !ganttData?.length ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
              <p className="text-sm font-medium text-foreground">Aucune tâche planifiée</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Aucune tâche de ce projet n\'a de date planifiée.' : 'Aucune de vos tâches dans ce projet n\'a de date planifiée.'}
              </p>
            </div>
          ) : (
            <GanttChart tasks={ganttData} variant="compact" />
          )}
        </div>
      )}

      {tab === 'progress' && (
        <ProjectProgressReport
          dashboard={dashboard}
          tasks={tasks || []}
          project={project}
          criticalPath={criticalPath}
        />
      )}
      {tab === 'reports' && <ProjectReportsTab projectId={id} />}


      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={id}
        onInvited={() => {
          queryClient.invalidateQueries({ queryKey: ['project-members', id] });
          queryClient.invalidateQueries({ queryKey: ['project', id] });
          queryClient.invalidateQueries({ queryKey: ['invitations-pending'] });
        }}
      />

      <DailyProgressModal
        open={!!worklogTask}
        onClose={() => setWorklogTask(null)}
        task={worklogTask}
        projectId={id}
      />
    </div>
  );
}

function InviteUserModal({ open, onClose, projectId, onInvited }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!open) {
      setSuccess(null);
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload) => api.post(`/projects/${projectId}/invite`, payload),
    onSuccess: (response) => {
      onInvited?.();
      setSuccess(response.data);
      setError(null);
      setEmail("");
    },
    onError: (e) => {
      setError(e.response?.data?.message || e.message || "Erreur");
    },
  });

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Inviter un client" size="md">
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">{success.message}</p>
            <p className="mt-2 text-xs text-emerald-800/90">
              Partagez ce lien (valide 48&nbsp;h, usage unique après acceptation)&nbsp;:
            </p>
            <p className="mt-1 break-all rounded border border-border bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">
              {typeof window !== "undefined" ? `${window.location.origin}${success.invitation_path}` : success.invitation_path}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 border-emerald-300"
              onClick={() => {
                const url = `${window.location.origin}${success.invitation_path}`;
                navigator.clipboard.writeText(url);
              }}
            >
              Copier le lien
            </Button>
          </div>
        )}
        {!success && (
          <>
            <p className="text-xs text-muted-foreground">
              Le client aura un acc&egrave;s en lecture seule : il pourra consulter le Kanban, le Gantt et les tableaux de bord.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium">E-mail du client</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@exemple.com"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
              <Button
                type="button"
                disabled={!email.trim() || mutation.isPending}
                onClick={() => mutation.mutate({ email: email.trim(), role: "client" })}
              >
                {mutation.isPending ? "Envoi…" : "Créer l’invitation"}
              </Button>
            </div>
          </>
        )}
        {success && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleClose}>Fermer</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

const ACTIVITY_ICON_MAP = {
  pencil: Pencil,
  plus: Plus,
  trash: Trash2,
  layout: LayoutGrid,
  message: MessageSquare,
  clock: Clock,
  link: Link2,
  users: Users,
  folder: FolderKanban,
  user: User,
  activity: History,
};

function ActivityChangeValue({ row }) {
  if (row.kind === 'workflow') {
    return (
      <span
        className={cn(
          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
          workflowBadgeClass(row.raw),
        )}
      >
        {row.value}
      </span>
    );
  }
  if (row.kind === 'priority') {
    return (
      <span
        className={cn(
          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
          priorityBadgeClass(row.raw),
        )}
      >
        {row.value}
      </span>
    );
  }
  if (row.kind === 'issue') {
    return (
      <Badge variant="outline" className="font-medium">
        {row.value}
      </Badge>
    );
  }
  if (row.kind === 'multiline') {
    return <span className="whitespace-pre-wrap text-foreground">{row.value}</span>;
  }
  return <span className="font-medium text-foreground">{row.value}</span>;
}

function ProjectActivityTab({ projectId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => api.get(`/projects/${projectId}/activity`, { params: { per_page: 50 } }).then((r) => r.data),
    enabled: Boolean(projectId),
  });

  const items = data?.activities?.data ?? data?.activities ?? [];

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-foreground">Historique & audit</h3>
            <p className="text-xs text-muted-foreground">
              Journal des actions sur ce projet, avec le détail des modifications lisible (sans JSON brut).
            </p>
          </div>
        </div>
        <ul className="space-y-3">
          {items.map((a) => {
            const meta = a.meta || {};
            const headline = getActivityHeadline(a.action, meta);
            const detailRows = getActivityDetailRows(a.action, meta);
            const iconName = getActivityIconName(a.action);
            const Icon = ACTIVITY_ICON_MAP[iconName] || History;
            const actorName = a.actor?.name || 'Système';

            return (
              <li
                key={a.id}
                className="flex gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:border-border"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium leading-snug text-foreground">{headline}</p>
                    <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={a.created_at || undefined}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('fr-FR') : ''}
                    </time>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <UserAvatar name={actorName} src={a.actor?.avatar_url} size="sm" className="shrink-0" />
                    <span className="text-xs text-muted-foreground">{actorName}</span>
                  </div>
                  {detailRows.length > 0 && (
                    <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      {detailRows.map((row) => (
                        <li
                          key={`${a.id}-${row.key}`}
                          className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
                        >
                          <span className="shrink-0 text-xs font-medium text-muted-foreground sm:w-40">{row.label}</span>
                          <div className="min-w-0 text-sm">
                            <ActivityChangeValue row={row} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && (
          <EmptyState
            icon={History}
            title="Aucune activité enregistrée"
            description="Les créations, modifications et déplacements de tâches apparaîtront ici."
          />
        )}
      </CardContent>
    </Card>
  );
}

function KanbanBoard({
  columns,
  tasksByWorkflow,
  onDrop,
  onDragOver,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onLogWork,
  canWriteProject,
  isAdmin,
  movePending,
}) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${movePending ? 'opacity-70' : ''}`}>
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex h-[min(72vh,680px)] w-72 flex-shrink-0 flex-col rounded-lg bg-accent/30"
          onDrop={(e) => canWriteProject && onDrop(e, col.id)}
          onDragOver={onDragOver}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between rounded-t-lg bg-accent/60 px-3 py-2 backdrop-blur-sm border-b border-border/30">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  col.id === 'done'
                    ? 'bg-emerald-500'
                    : col.id === 'in_progress'
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                }`}
              />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tasksByWorkflow(col.id).length}
              </span>
            </div>
            {canWriteProject && col.id !== 'done' && (
              <button
                type="button"
                onClick={() => onAddTask(col.id)}
                className="rounded p-1 hover:bg-accent"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Scrollable cards */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2 pr-1">
            {tasksByWorkflow(col.id).map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onClick={() => onEditTask(task)}
                onDelete={canWriteProject && (isAdmin || task?.access?.can_delete === true)
                  ? () => onDeleteTask(task)
                  : null}
                onLogWork={onLogWork ? () => onLogWork(task) : null}
                canWriteTask={canWriteProject && (isAdmin || task?.access?.can_edit !== false)}
                columns={columns}
                currentColumn={col.id}
                onMoveToColumn={(targetCol) => {
                  onDrop({ preventDefault: () => {}, dataTransfer: { getData: () => String(task.id) } }, targetCol);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ task, onClick, onDelete, onLogWork, canWriteTask, columns, currentColumn, onMoveToColumn }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  const wf = task.workflow_status || 'todo';
  const borderAccent =
    wf === 'done'
      ? 'border-l-emerald-500'
      : wf === 'at_risk'
        ? 'border-l-red-500'
        : wf === 'in_progress'
          ? 'border-l-amber-400'
          : 'border-l-slate-300';

  const issueType = task.issue_type || task.type || 'task';
  const issueTypeLabel = ISSUE_TYPE_LABELS[issueType] || issueType;

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      draggable={canWriteTask}
      onDragStart={canWriteTask ? handleDragStart : undefined}
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border border-border border-l-4 ${borderAccent} bg-card p-3 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-snug">{task.title}</h4>
        <div className="flex flex-shrink-0 items-center gap-1">
          {onLogWork && task.workflow_status !== 'done' && task.workflow_status !== 'todo' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLogWork(); }}
              className="rounded p-0.5 text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-indigo-700"
              title="Journaliser le travail"
            >
              <TrendingUp className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {canWriteTask && <GripVertical className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {issueTypeLabel}
        </span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>
          {PRIORITY_LABELS_FR[task.priority] || task.priority}
        </span>

        {task.story_points != null && task.story_points !== '' && (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {task.story_points} pts
          </span>
        )}

        {task.estimated_duration != null && (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            ~{formatEstMinutes(task.estimated_duration)}
          </span>
        )}

        {task.risk_level && (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              task.risk_level === 'high'
                ? 'bg-red-100 text-red-800'
                : task.risk_level === 'medium'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Risque {task.risk_level}
          </span>
        )}

        {task.is_overdue && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> En retard
          </span>
        )}

        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex -space-x-1">
          {(task.assignees || []).slice(0, 3).map((a) => {
            const name = a.name || a.user?.name || '?';
            const avatarUrl = a.avatar_url || a.user?.avatar_url;
            return avatarUrl ? (
              <img key={a.id} src={avatarUrl} alt={name} title={name}
                className="h-7 w-7 rounded-full border-2 border-white object-cover" />
            ) : (
              <div key={a.id} title={name}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary/15 text-xs font-semibold text-primary">
                {name[0].toUpperCase()}
              </div>
            );
          })}
        </div>
        {task.progress_percent > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-16 rounded-full bg-accent">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${task.progress_percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{task.progress_percent}%</span>
          </div>
        )}
      </div>
      {/* Mobile: move-to-column select (touch devices can't drag) */}
      {canWriteTask && columns && onMoveToColumn && (
        <div className="mt-2 sm:hidden">
          <select
            className="w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground"
            value={currentColumn}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.value !== currentColumn) onMoveToColumn(e.target.value);
            }}
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
    </motion.div>
  );
}

function MembersTab({ project, projectId, canEditProject, canInvite, isAdmin, onOpenInvite }) {
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => (
      r.data?.members?.data ?? r.data?.members ?? []
    )),
  });

  const { data: allUsers = [], isFetching: usersLoading } = useQuery({
    queryKey: ['project-user-search', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/user-search`).then((r) => {
        const raw = r.data?.users ?? r.data?.data ?? [];
        return Array.isArray(raw) ? raw : [];
      }),
    enabled: showAdd && canEditProject,
    staleTime: 30_000,
  });

  const trimmedInput = userSearch.trim().toLowerCase();
  const filteredUsers = trimmedInput.length > 0
    ? allUsers.filter((u) => u.name?.toLowerCase().includes(trimmedInput))
    : allUsers;

  const addMutation = useMutation({
    mutationFn: (userId) => api.post(`/projects/${projectId}/members`, { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-user-search', projectId] });
      setShowAdd(false);
      setUserSearch('');
      setSelectedUser(null);
      setDropdownOpen(false);
      toast.success('Membre ajouté.');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur lors de l\'ajout.'),
  });

  // Current authenticated user (to detect if they are the project chef)
  const { user: currentUser } = useAuth();

  const [confirmMember, setConfirmMember] = useState(null);

  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/projects/${projectId}/members/${uid}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setConfirmMember(null);
      toast.success(data?.data?.message || 'Membre retiré du projet.');
    },
    onError: (err) => {
      setConfirmMember(null);
      toast.error(err?.response?.data?.message || 'Erreur lors du retrait.');
    },
  });

  const chef    = (members ?? []).find((m) => m.is_chef);
  const membres = (members ?? []).filter((m) => !m.is_chef);

  // Chef du projet courant peut aussi retirer des membres
  const isCurrentUserChef = !isAdmin && chef?.id === currentUser?.id;
  const canManageMembers  = isAdmin || isCurrentUserChef;

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">Membres du projet</h3>
        {canEditProject && (
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
          </Button>
        )}
      </div>

      {/* Add member panel — no role selector */}
      {showAdd && canEditProject && (
        <Card className="overflow-visible">
          <CardContent className="flex flex-col gap-4 overflow-visible p-4 sm:flex-row sm:items-end">
            <div className="relative z-20 min-w-0 flex-1" ref={searchWrapRef}>
              <label className="mb-1 block text-sm font-medium">Utilisateur</label>
              {selectedUser ? (
                <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-input bg-muted/30 px-3 text-sm">
                  <span className="truncate font-medium text-foreground">{selectedUser.name}</span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-primary hover:underline"
                    onClick={() => { setSelectedUser(null); setUserSearch(''); setDropdownOpen(false); }}
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    autoComplete="off"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setDropdownOpen(false); }}
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                    placeholder="Filtrer par nom…"
                  />
                  {dropdownOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 z-[200] mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
                    >
                      {usersLoading && <p className="px-3 py-2.5 text-xs text-muted-foreground">Chargement…</p>}
                      {!usersLoading && filteredUsers.length === 0 && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">Aucun utilisateur disponible.</p>
                      )}
                      {!usersLoading && filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          className="block w-full border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedUser(u); setUserSearch(''); setDropdownOpen(false); }}
                        >
                          <span className="font-medium text-foreground">{u.name}</span>
                          {u.specialties?.length > 0 ? (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {u.specialties.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                  style={{ backgroundColor: s.color || '#6366f1' }}
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="block text-xs text-muted-foreground">{u.email}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => selectedUser && addMutation.mutate(selectedUser.id)}
              disabled={!selectedUser || addMutation.isPending}
            >
              {addMutation.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chef de projet */}
      {chef && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            👑 Chef de projet
          </p>
          <MemberRow member={chef} isChef removable={false} />
        </div>
      )}

      {/* ── Fenêtre de confirmation de retrait ── */}
      {confirmMember && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Retirer <span className="text-destructive">{confirmMember.name}</span> du projet ?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Son accès sera révoqué immédiatement. Une notification lui sera envoyée.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmMember(null)}
                disabled={removeMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => removeMutation.mutate(confirmMember.id)}
                disabled={removeMutation.isPending}
              >
                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                {removeMutation.isPending ? 'Retrait…' : 'Confirmer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membres */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          👤 Membres ({membres.length})
        </p>
        {membres.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun membre ajouté</p>
        ) : (
          <div className="space-y-2">
            {membres.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isChef={false}
                removable={canManageMembers}
                onRemove={() => setConfirmMember(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member: m, isChef, removable, onRemove }) {
  const specs     = m.specialties || [];
  const canRemove = removable && !isChef;
  return (
    <div className={`flex items-center justify-between rounded-lg border bg-card p-3 ${isChef ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className="flex items-center gap-3">
        {m.avatar_url ? (
          <img src={m.avatar_url} alt={m.name} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-background" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {m.name?.[0] || '?'}
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">{m.name}</p>
            {isChef && <Crown className="h-3.5 w-3.5 text-amber-500" />}
          </div>
          {specs.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {specs.map((s) => (
                <span key={s.id || s.name} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{m.email}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isChef ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Crown className="h-3 w-3" /> Chef de projet
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Membre
          </span>
        )}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Retirer ce membre du projet"
          >
            <UserMinus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Retirer</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Onglet Fichiers : liste les pièces jointes de toutes les tâches du projet ── */
function ProjectFilesTab({ projectId, tasks }) {
  const { data: allAttachments, isLoading } = useQuery({
    queryKey: ['project-attachments', projectId],
    queryFn: async () => {
      const taskList = Array.isArray(tasks) ? tasks : [];
      if (taskList.length === 0) return [];
      const results = await Promise.all(
        taskList.slice(0, 50).map((t) =>
          api.get(`/tasks/${t.id}/attachments`).then((r) => {
            const list = r.data?.attachments?.data ?? r.data?.attachments ?? r.data?.data ?? r.data ?? [];
            return (Array.isArray(list) ? list : []).map((a) => ({ ...a, task_title: t.title, task_id: t.id }));
          }).catch(() => [])
        )
      );
      return results.flat();
    },
    staleTime: 30000,
  });

  const attachments = allAttachments ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <EmptyState
        icon={Download}
        title="Aucun fichier"
        description="Les fichiers partagés sur les tâches de ce projet apparaîtront ici."
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="text-sm text-muted-foreground mb-3">
        {attachments.length} fichier{attachments.length > 1 ? 's' : ''} partagé{attachments.length > 1 ? 's' : ''}
      </p>
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{att.original_name || att.filename || att.name}</p>
            <p className="text-xs text-muted-foreground">
              Tâche : {att.task_title}
              {att.size ? ` · ${(att.size / 1024).toFixed(1)} Ko` : ''}
            </p>
          </div>
          <a
            href={`/api/tasks/${att.task_id}/attachments/${att.id}/download`}
            download
            className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
          >
            <Download size={14} />
            Télécharger
          </a>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Rapport d'avancement — Premium SVG Charts
   ───────────────────────────────────────────────────────────── */

/* Multi-segment donut with animated arcs */
function MultiSegmentDonut({ segments, size = 180, stroke = 22, label, sublabel, labelColor = '#6366f1' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cumAngle = 0;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
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
            <circle
              key={seg.key}
              cx={cx} cy={cx} r={r} fill="none"
              stroke={seg.color}
              strokeWidth={stroke - 3}
              strokeDasharray={`${dashLen} ${C}`}
              strokeLinecap="butt"
              transform={`rotate(${startAngle}, ${cx}, ${cx})`}
              style={{
                transition: 'stroke-dasharray 0.85s cubic-bezier(0.4,0,0.2,1)',
                transitionDelay: `${0.08 + si * 0.07}s`,
                filter: seg.value > 0 ? 'url(#donut-glow)' : undefined,
              }}
            />
          );
        })}
        {/* Inner track decoration */}
        <circle cx={cx} cy={cx} r={r - stroke / 2 - 4} fill="none" stroke="currentColor" strokeWidth={0.5} className="text-border/20" strokeDasharray="3 6" />
      </svg>
      {label != null && (
        <div className="pointer-events-none absolute flex flex-col items-center gap-0.5 select-none">
          <span className="text-[32px] font-black tabular-nums leading-none" style={{ color: labelColor }}>{label}</span>
          {sublabel && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

/* Pentagon radar chart — project health on 5 axes */
function HealthRadar({ metrics, size = 186 }) {
  const n = metrics.length;
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 28;
  const angles = metrics.map((_, i) => (i * 2 * Math.PI / n) - Math.PI / 2);
  const rings = [0.25, 0.5, 0.75, 1.0];
  const toStr = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const axisEnds = angles.map(a => [cx + maxR * Math.cos(a), cy + maxR * Math.sin(a)]);
  const dataPoints = metrics.map((m, i) => {
    const r = (m.value / 100) * maxR;
    return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])];
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.06" />
        </radialGradient>
      </defs>
      {rings.map((pct, ri) => {
        const pts = angles.map(a => [cx + pct * maxR * Math.cos(a), cy + pct * maxR * Math.sin(a)]);
        return (
          <polygon key={ri} points={toStr(pts)} fill="none"
            stroke="currentColor" strokeWidth={ri === rings.length - 1 ? 0.8 : 0.5}
            className={ri === rings.length - 1 ? 'text-border/50' : 'text-border/25'} />
        );
      })}
      {axisEnds.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="currentColor" strokeWidth={0.6} className="text-border/35" />
      ))}
      <motion.polygon
        points={toStr(dataPoints)}
        fill="url(#radar-fill)"
        stroke="#6366f1"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {dataPoints.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={4}
          fill="#6366f1" stroke="white" strokeWidth={2}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.35, type: 'spring', stiffness: 300 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      {metrics.map((m, i) => {
        const lx = cx + (maxR + 20) * Math.cos(angles[i]);
        const ly = cy + (maxR + 20) * Math.sin(angles[i]);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill="currentColor" className="text-muted-foreground"
            style={{ fontSize: '9px', fontFamily: 'inherit', fontWeight: 600 }}>
            {m.label}
          </text>
        );
      })}
      {metrics.map((m, i) => {
        const vr = (m.value / 100) * maxR;
        const vx = cx + (vr + 10) * Math.cos(angles[i]);
        const vy = cy + (vr + 10) * Math.sin(angles[i]);
        return (
          <text key={`v${i}`} x={vx} y={vy} textAnchor="middle" dominantBaseline="middle"
            fill="#6366f1" style={{ fontSize: '8px', fontFamily: 'inherit', fontWeight: 700 }}>
            {m.value}
          </text>
        );
      })}
    </svg>
  );
}

/* Proportional stacked bar */
function StackedBar({ segments, height = 12 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-border/20" style={{ height }}>
      {segments.map((seg, i) =>
        seg.value > 0 ? (
          <div key={seg.key} title={`${seg.label}: ${seg.value}`}
            style={{
              width: `${(seg.value / total) * 100}%`,
              background: seg.color,
              transition: `width 0.85s cubic-bezier(0.4,0,0.2,1) ${i * 0.07}s`,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

/* Horizontal bar rows with dual fill (done + active) */
function AssigneeRows({ assignees }) {
  const max = Math.max(1, ...assignees.map(a => a.total));
  if (!assignees.length) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Users className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Aucune assignation</p>
    </div>
  );
  return (
    <div className="space-y-3.5">
      {assignees.map((a, ai) => (
        <motion.div key={a.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: ai * 0.05 + 0.1, duration: 0.3 }}
          className="flex items-center gap-3"
        >
          {a.avatar_url ? (
            <img src={a.avatar_url} alt={a.name} className="h-7 w-7 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-sm">
              {(a.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs font-semibold text-foreground truncate max-w-[90px]">{a.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0 ml-1">{a.done}/{a.total}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-border/25 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500/80"
                style={{ width: `${(a.done / max) * 100}%`, transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${ai * 0.05 + 0.15}s` }} />
              <div className="absolute inset-y-0 rounded-full bg-amber-400/70"
                style={{
                  left: `${(a.done / max) * 100}%`,
                  width: `${(a.active / max) * 100}%`,
                  transition: `left 0.8s cubic-bezier(0.4,0,0.2,1) ${ai * 0.05 + 0.15}s, width 0.8s cubic-bezier(0.4,0,0.2,1) ${ai * 0.05 + 0.15}s`,
                }} />
            </div>
          </div>
        </motion.div>
      ))}
      <div className="flex gap-5 pt-1.5 border-t border-border/50">
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Terminées
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> En cours
        </span>
      </div>
    </div>
  );
}

/* Horizontal bar rows for priority/type breakdown */
function MetricBars({ items }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="flex items-center gap-2 w-28 shrink-0">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-xs font-medium text-muted-foreground truncate">{item.label}</span>
          </div>
          <div className="relative flex-1 h-5 rounded-lg overflow-hidden bg-border/20">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-lg"
              style={{ background: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: idx * 0.07 + 0.1 }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectProgressReport({ dashboard, tasks, project, criticalPath }) {
  const total = dashboard?.total_tasks ?? tasks.length ?? 0;
  const completed = dashboard?.completed_tasks ?? tasks.filter((t) => normalizeWorkflowStatus(t.workflow_status) === 'done').length;
  const overdue = dashboard?.overdue_tasks ?? tasks.filter((t) => t.is_overdue).length;
  const progress = dashboard?.avg_progress ?? (total > 0 ? Math.round((completed / total) * 100) : 0);

  const byWorkflow = {
    todo: tasks.filter((t) => normalizeWorkflowStatus(t.workflow_status) === 'todo').length,
    in_progress: tasks.filter((t) => normalizeWorkflowStatus(t.workflow_status) === 'in_progress').length,
    done: tasks.filter((t) => normalizeWorkflowStatus(t.workflow_status) === 'done').length,
    at_risk: tasks.filter((t) => t.workflow_status === 'at_risk').length,
  };
  const byPriority = {
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };

  const assigneeWorkload = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      (task.assignees || []).forEach((a) => {
        const u = a.user || a;
        if (!u?.id) return;
        const cur = map.get(u.id) || { id: u.id, name: u.name || 'Membre', done: 0, active: 0, total: 0 };
        cur.total++;
        if (normalizeWorkflowStatus(task.workflow_status) === 'done') cur.done++;
        else cur.active++;
        map.set(u.id, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [tasks]);

  const startDate = project?.start_date ? new Date(project.start_date) : null;
  const endDate = project?.end_date ? new Date(project.end_date) : null;
  const now = new Date();
  let timeProgress = null;
  let daysLeft = null;
  if (startDate && endDate && endDate > startDate) {
    const total_ms = endDate - startDate;
    const elapsed_ms = Math.min(now - startDate, total_ms);
    timeProgress = Math.max(0, Math.round((elapsed_ms / total_ms) * 100));
    daysLeft = Math.ceil((endDate - now) / 86400000);
  }

  const radarMetrics = [
    { label: 'Complétion', value: progress },
    {
      label: 'Ponctualité',
      value: timeProgress != null ? Math.max(0, Math.min(100, 100 - Math.max(0, timeProgress - progress))) : Math.round(progress * 0.9),
    },
    { label: 'Stabilité', value: total > 0 ? Math.max(0, Math.round(100 - (byWorkflow.at_risk / total) * 200)) : 100 },
    { label: 'Priorités', value: total > 0 ? Math.max(0, Math.round(100 - (byPriority.urgent / total) * 100)) : 100 },
    {
      label: 'Couverture',
      value: total > 0 ? Math.round((tasks.filter((t) => (t.assignees || []).length > 0).length / total) * 100) : 0,
    },
  ];
  const healthScore = Math.round(radarMetrics.reduce((s, m) => s + m.value, 0) / radarMetrics.length);
  const healthColor = healthScore >= 75 ? '#22c55e' : healthScore >= 50 ? '#f59e0b' : '#ef4444';
  const progressColor = progress >= 75 ? '#22c55e' : progress >= 40 ? '#f59e0b' : '#ef4444';

  const donutSegments = [
    { key: 'done', label: 'Terminé', value: byWorkflow.done, color: '#22c55e' },
    { key: 'in_progress', label: 'En cours', value: byWorkflow.in_progress, color: '#f59e0b' },
    { key: 'todo', label: 'À faire', value: byWorkflow.todo, color: '#94a3b8' },
    { key: 'at_risk', label: 'À risque', value: byWorkflow.at_risk, color: '#ef4444' },
  ];

  const kpis = [
    {
      label: 'Avancement', value: `${progress}%`, sub: `${completed}/${total} tâches`,
      accent: progressColor, bg: progress >= 75 ? 'from-emerald-50/60 to-card dark:from-emerald-950/20' : progress >= 40 ? 'from-amber-50/60 to-card dark:from-amber-950/20' : 'from-red-50/60 to-card dark:from-red-950/20',
    },
    {
      label: 'Terminées', value: completed, sub: `sur ${total} tâches`,
      accent: '#6366f1', bg: 'from-indigo-50/50 to-card dark:from-indigo-950/20',
    },
    {
      label: 'En retard', value: overdue, sub: overdue > 0 ? 'Attention requise' : 'Aucun retard',
      accent: overdue > 0 ? '#ef4444' : '#22c55e', bg: overdue > 0 ? 'from-red-50/60 to-card dark:from-red-950/20' : 'from-emerald-50/40 to-card dark:from-emerald-950/20',
    },
    {
      label: 'Santé du projet', value: `${healthScore}/100`, sub: healthScore >= 75 ? 'Excellent' : healthScore >= 50 ? 'Correct' : 'À surveiller',
      accent: healthColor, bg: healthScore >= 75 ? 'from-emerald-50/60 to-card dark:from-emerald-950/20' : healthScore >= 50 ? 'from-amber-50/60 to-card dark:from-amber-950/20' : 'from-red-50/60 to-card dark:from-red-950/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5 pt-2"
    >
      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={cn('relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-5 shadow-sm', kpi.bg)}
          >
            <div
              className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 blur-2xl"
              style={{ background: kpi.accent }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums leading-none" style={{ color: kpi.accent }}>{kpi.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{kpi.sub}</p>
            <div className="absolute bottom-0 left-0 h-0.5 w-full opacity-60" style={{ background: kpi.accent }} />
          </motion.div>
        ))}
      </div>

      {/* ── Main charts: 3-column bento ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Donut — répartition des tâches */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Répartition des tâches</h3>
          <p className="text-[11px] text-muted-foreground mb-5">Distribution par statut workflow</p>
          <div className="flex flex-col items-center gap-5 flex-1">
            <MultiSegmentDonut
              segments={donutSegments}
              size={180} stroke={24}
              label={`${progress}%`} sublabel="Terminé"
              labelColor={progressColor}
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 w-full">
              {donutSegments.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                  <span className="text-xs text-muted-foreground truncate">{seg.label}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums text-foreground">{seg.value}</span>
                </div>
              ))}
            </div>
            <StackedBar segments={donutSegments} height={8} />
          </div>
        </motion.div>

        {/* Radar — santé du projet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 via-card to-card dark:from-indigo-950/20 p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Santé du projet</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Score multidimensionnel</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tabular-nums leading-none" style={{ color: healthColor }}>
                {healthScore}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">/100</div>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center mt-2">
            <HealthRadar metrics={radarMetrics} size={186} />
          </div>
        </motion.div>

        {/* Assignee workload */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.26, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Charge par membre</h3>
          <p className="text-[11px] text-muted-foreground mb-5">Tâches terminées vs en cours</p>
          <AssigneeRows assignees={assigneeWorkload} />
        </motion.div>
      </div>

      {/* ── Secondary row ── */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Priority distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h3 className="mb-1 text-sm font-semibold text-foreground">Répartition par priorité</h3>
          <p className="text-[11px] text-muted-foreground mb-5">Nombre de tâches par niveau d'urgence</p>
          <MetricBars items={[
            { label: 'Urgente', value: byPriority.urgent, color: '#ef4444' },
            { label: 'Haute', value: byPriority.high, color: '#f97316' },
            { label: 'Moyenne', value: byPriority.medium, color: '#f59e0b' },
            { label: 'Basse', value: byPriority.low, color: '#3b82f6' },
          ]} />
          {/* Mini stacked bar for priority */}
          <div className="mt-5 pt-4 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground mb-2">Vue proportionnelle</p>
            <StackedBar height={10} segments={[
              { key: 'urgent', label: 'Urgente', value: byPriority.urgent, color: '#ef4444' },
              { key: 'high', label: 'Haute', value: byPriority.high, color: '#f97316' },
              { key: 'medium', label: 'Moyenne', value: byPriority.medium, color: '#f59e0b' },
              { key: 'low', label: 'Basse', value: byPriority.low, color: '#3b82f6' },
            ]} />
          </div>
        </motion.div>

        {/* Timeline progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h3 className="mb-1 text-sm font-semibold text-foreground">Avancement calendaire</h3>
          <p className="text-[11px] text-muted-foreground mb-5">Temps écoulé vs progression des tâches</p>
          {timeProgress != null ? (
            <div className="space-y-5">
              {/* Task progress track */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Avancement tâches</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: progressColor }}>{progress}%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-border/25">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: progressColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                  />
                </div>
              </div>
              {/* Time progress track */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Temps écoulé</span>
                  <span className={cn('text-xs font-bold tabular-nums', daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-blue-600')}>{timeProgress}%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-border/25">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${timeProgress}%` }}
                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
                  />
                </div>
              </div>
              {/* Date range */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</span>
                <span className={cn('font-semibold px-2 py-0.5 rounded-full text-[11px]',
                  daysLeft < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : daysLeft <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}j de retard` : daysLeft === 0 ? "Aujourd'hui" : `${daysLeft}j restants`}
                </span>
                <span>{project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</span>
              </div>
              {/* Gap analysis badge */}
              <div className={cn('rounded-xl px-4 py-3 text-xs font-medium',
                progress >= timeProgress
                  ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300'
                  : 'bg-amber-50 border border-amber-200/80 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300')}>
                {progress >= timeProgress
                  ? `✅ En avance — tâches à ${progress}% vs ${timeProgress}% du temps écoulé.`
                  : `⚠️ En retard — tâches à ${progress}% vs ${timeProgress}% du temps écoulé.`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Calendar className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground text-center">
                Définissez les dates de début et fin du projet pour activer cette vue.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Critical path ── */}
      {criticalPath?.graph_valid && criticalPath?.critical_tasks?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="rounded-2xl border border-red-200/80 bg-gradient-to-r from-red-50/60 to-orange-50/30 p-6 shadow-sm dark:border-red-900/30 dark:from-red-950/20 dark:to-orange-950/10"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Chemin critique
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {criticalPath.critical_tasks.length}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {criticalPath.critical_tasks.slice(0, 8).map((ct) => (
              <span key={ct.id} className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium flex items-center gap-1.5',
                ct.is_delayed
                  ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
              )}>
                {ct.is_delayed && <AlertTriangle className="h-3 w-3 shrink-0" />}
                {ct.title}
              </span>
            ))}
            {criticalPath.critical_tasks.length > 8 && (
              <span className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                +{criticalPath.critical_tasks.length - 8} autres
              </span>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ProjectReportsTab({ projectId }) {
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['client-report', projectId],
    queryFn: () => api.get(`/client/projects/${projectId}/report`).then((r) => r.data),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
        Rapport indisponible pour le moment.
      </div>
    );
  }

  const aiRisk = report.ai_risk_analysis;
  const aiRecs = report.ai_recommendations;
  const stats = report.stats;
  const distribution = report.task_distribution || [];

  return (
    <div className="space-y-4 pt-2">
      {/* KPIs projet */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi label="Avancement" value={`${report.progress ?? 0}%`} color="emerald" />
        <ReportKpi label="Tâches terminées" value={`${stats?.completed ?? 0}/${stats?.total_tasks ?? 0}`} color="blue" />
        <ReportKpi label="En retard" value={stats?.overdue ?? 0} color={stats?.overdue > 0 ? 'red' : 'emerald'} />
        <ReportKpi label="À risque" value={stats?.at_risk ?? 0} color={stats?.at_risk > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* Deadline estimée */}
      {report.estimated_deadline && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <span className="text-muted-foreground">Deadline estimée : </span>
          <span className="font-semibold text-foreground">
            {new Date(report.estimated_deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* Alertes */}
      {report.alerts?.length > 0 && (
        <div className="space-y-2">
          {report.alerts.map((alert, idx) => (
            <div key={idx} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
              alert.type === 'danger' ? 'bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200' :
              alert.type === 'warning' ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200' :
              'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
            }`}>
              <AlertTriangle size={16} />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Analyse IA */}
      {aiRisk && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <p className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" />
            Analyse IA — Risques
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Risque de retard</p>
              <p className={`text-2xl font-bold tabular-nums ${aiRisk.delay_probability > 60 ? 'text-red-600' : aiRisk.delay_probability > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {aiRisk.delay_probability ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Santé planning</p>
              <p className={`text-lg font-bold ${aiRisk.schedule_health === 'critical' ? 'text-red-600' : aiRisk.schedule_health === 'watch' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {aiRisk.schedule_health === 'critical' ? '⚠️ Critique' : aiRisk.schedule_health === 'watch' ? '👀 À surveiller' : '✅ Bonne'}
              </p>
            </div>
            {aiRisk.summary && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tâches à risque</p>
                <p className="text-2xl font-bold tabular-nums text-amber-600">{aiRisk.summary.at_risk ?? 0}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommandations IA */}
      {aiRecs?.recommendations && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">💡 Recommandations IA</p>
          <ul className="space-y-2">
            {(Array.isArray(aiRecs.recommendations) ? aiRecs.recommendations : []).slice(0, 5).map((rec, idx) => {
              const text = typeof rec === 'string' ? rec : rec.message || rec.recommendation || JSON.stringify(rec);
              return (
                <li key={idx} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  <span className="mt-0.5 text-indigo-500 shrink-0">→</span>
                  <span className="text-foreground">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Activité récente */}
      {report.recent_activities?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
            <History size={16} />
            Dernières activités
          </p>
          <ul className="space-y-2">
            {report.recent_activities.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-foreground">{a.description || a.action}</span>
                  <span className="ml-1 text-xs text-muted-foreground">— {a.user}</span>
                </div>
                {a.date && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.date).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Équipe */}
      {report.team?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
            <Users size={16} />
            Équipe
          </p>
          <div className="flex flex-wrap gap-2">
            {report.team.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-sm">
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
    </div>
  );
}

function ReportKpi({ label, value, color }) {
  const colorMap = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colorMap[color] || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

