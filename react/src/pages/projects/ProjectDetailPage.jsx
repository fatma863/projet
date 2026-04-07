import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import TaskModal from './TaskModal';
import { DueDateRangeFilter } from '../../components/tasks/DueDateRangeFilter';
import { WORKFLOW_COLUMNS, ISSUE_TYPE_LABELS } from '../../lib/taskConstants';
import { PROJECT_ROLE_LABELS, formatProjectRole } from '../../lib/roles';
import {
  ArrowLeft, Plus, GripVertical, Clock, User, AlertTriangle,
  BarChart3, Users, Calendar, Mail, Download, History, Layers, ChevronDown,
  Pencil, Trash2, LayoutGrid, MessageSquare, Link2, FolderKanban,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const [taskModal, setTaskModal] = useState({ open: false, task: null, defaultWorkflow: 'todo' });
  const [kanbanFilters, setKanbanFilters] = useState({
    user: '', priority: '', type: '', workflow: '', due_from: '', due_to: '',
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState('kanban');
  const isAdmin = user?.roles?.includes('admin');

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
            workflow_status: normalizeWorkflowStatus(getTaskStatus(t)),
          }));

        if (import.meta.env.DEV) {
          console.debug('[ProjectDetailPage] tasks API response', {
            projectId,
            fetched: Array.isArray(rawTasks) ? rawTasks.length : 0,
            keptForProject: normalized.length,
            filteredOut: (Array.isArray(rawTasks) ? rawTasks.length : 0) - normalized.length,
            filters: kanbanFilters,
          });
          console.log('[ProjectDetailPage] tasks before filtering', normalized);
        }

        return normalized;
      };

      try {
        const r = await api.get(`/projects/${id}/tasks?all=1`);
        const rawTasks = r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? [];
        const primary = normalizeList(rawTasks);
        if (primary.length > 0) {
          return primary;
        }

        if (import.meta.env.DEV) {
          console.warn('[ProjectDetailPage] project tasks endpoint returned empty, trying global fallback', {
            projectId,
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[ProjectDetailPage] project tasks endpoint failed, trying global fallback', {
            projectId,
            error: error?.response?.data ?? error?.message,
          });
        }
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
      setTaskModal({
        open: true,
        task: found,
        defaultWorkflow: found.workflow_status || 'todo',
      });
      const next = new URLSearchParams(searchParams);
      next.delete('highlightTask');
      setSearchParams(next, { replace: true });
    }
  }, [tasks, searchParams, setSearchParams]);

  useEffect(() => {
    if (import.meta.env.DEV && Array.isArray(tasks) && tasks.length > 0) {
      console.log('TASK SAMPLE', tasks[0]);
    }
  }, [tasks]);

  const { data: dashboard } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data),
  });

  const { data: criticalPath } = useQuery({
    queryKey: ['project-critical-path', id],
    queryFn: () => api.get(`/projects/${id}/critical-path`).then((r) => r.data),
    enabled: Boolean(id),
  });
  const { data: ganttData, isLoading: loadingGantt } = useQuery({
    queryKey: ['project-gantt', id],
    enabled: isAdmin && tab === 'gantt',
    queryFn: () => api.get(`/projects/${id}/gantt`).then((r) => (
      r.data?.gantt ?? r.data?.data?.gantt ?? r.data?.data ?? []
    )),
  });

  const access = project?.access ?? {};
  /** Création de tâches / Kanban (hors invité projet). */
  const canWriteProject = isAdmin || Boolean(access.can_create_tasks);
  /** Paramètres projet, membres (admin projet ou admin app). */
  const canEditProject = isAdmin || Boolean(access.can_edit);
  /** Invitation par e-mail (admin projet ou admin app). */
  const canInvite = isAdmin || Boolean(access.can_invite);

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(`project.${id}`);

    channel.listen('.task.comment.created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    });

    return () => {
      echo.leave(`private-project.${id}`);
    };
  }, [id, queryClient]);

  const workflowMoveMutation = useMutation({
    mutationFn: ({ taskId, workflow_status }) =>
      api.put(`/tasks/${taskId}`, { workflow_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
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
      if (import.meta.env.DEV) {
        console.log('[ProjectDetailPage] tasks after filtering (no filters)', list);
      }
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
      const w = kanbanFilters.workflow;
      list = list.filter((t) => {
        const tw = normalizeWorkflowStatus(getTaskStatus(t));
        return tw === w;
      });
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
    if (import.meta.env.DEV) {
      console.log('[ProjectDetailPage] tasks after filtering', {
        filters: kanbanFilters,
        count: list.length,
        tasks: list,
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
      .filter((t) => {
        const w = normalizeWorkflowStatus(getTaskStatus(t));
        return w === columnId;
      })
      .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

  const handleDrop = (e, workflow) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!taskId) return;
    workflowMoveMutation.mutate({ taskId, workflow_status: workflow });
  };

  const handleDragOver = (e) => e.preventDefault();

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
              <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/projects/${id}/export/tasks`, {
                  headers: { Authorization: token ? `Bearer ${token}` : '', Accept: 'text/csv' },
                });
                if (!res.ok) throw new Error('Export impossible');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `projet-${project.code}-taches.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                toast.error('Export CSV impossible');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {canInvite && (
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Inviter
            </Button>
          )}
          {canWriteProject && (
            <Button onClick={() => setTaskModal({ open: true, task: null, defaultWorkflow: 'todo' })}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle tâche
            </Button>
          )}
        </div>
      </div>

      {!canWriteProject && (
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
          ...(isAdmin ? [{ key: 'gantt', label: 'Gantt' }] : []),
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Assigné</label>
              <Select
                value={kanbanFilters.user}
                onChange={(e) => setKanbanFilters((f) => ({ ...f, user: e.target.value }))}
                className="min-w-[140px]"
              >
                <option value="">Tous</option>
                {assigneeFilterOptions.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </Select>
            </div>
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
                <option value="at_risk">À risque</option>
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <Select
                value={kanbanFilters.type}
                onChange={(e) => setKanbanFilters((f) => ({ ...f, type: e.target.value }))}
                className="min-w-[120px]"
              >
                <option value="">Tous</option>
                <option value="task">Tâche</option>
                <option value="bug">Anomalie</option>
                <option value="story">Story</option>
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
                user: '', priority: '', type: '', workflow: '', due_from: '', due_to: '',
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
            onAddTask={(wf) => setTaskModal({ open: true, task: null, defaultWorkflow: wf })}
            onEditTask={(task) => setTaskModal({ open: true, task, defaultWorkflow: normalizeWorkflowStatus(getTaskStatus(task)) })}
            canWriteProject={canWriteProject}
            isAdmin={isAdmin}
            movePending={workflowMoveMutation.isPending}
          />
        </div>
      )}

      {tab === 'members' && (
        <MembersTab projectId={id} canEditProject={canEditProject} canInvite={canInvite} onOpenInvite={() => setInviteOpen(true)} />
      )}
      {tab === 'activity' && <ProjectActivityTab projectId={id} />}
      {/* Onglet Agile supprimé */}
      {tab === 'gantt' && (
        <div className="pt-4">
          {loadingGantt ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <GanttChart tasks={ganttData || []} variant="compact" />
          )}
        </div>
      )}

      {/* Modale tâche */}
      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, defaultWorkflow: 'todo' })}
        projectId={parseInt(id)}
        task={taskModal.task}
        defaultWorkflow={taskModal.defaultWorkflow}
        statuses={statuses || []}
        canWriteProject={canWriteProject}
        isAdmin={isAdmin}
      />

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
    </div>
  );
}

function InviteUserModal({ open, onClose, projectId, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
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
      setEmail('');
      setRole('member');
    },
    onError: (e) => {
      setError(e.response?.data?.message || e.message || 'Erreur');
    },
  });

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Inviter un utilisateur" size="md">
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
              {typeof window !== 'undefined' ? `${window.location.origin}${success.invitation_path}` : success.invitation_path}
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
            <div>
              <label className="mb-1 block text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collegue@exemple.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rôle sur le projet</label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">{PROJECT_ROLE_LABELS.member}</option>
                <option value="client">{PROJECT_ROLE_LABELS.client}</option>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Membre : tâches et commentaires. Client : lecture seule sur le projet (Kanban, Gantt en consultation).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
              <Button
                type="button"
                disabled={!email.trim() || mutation.isPending}
                onClick={() => mutation.mutate({ email: email.trim(), role })}
              >
                {mutation.isPending ? 'Envoi…' : 'Créer l’invitation'}
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

function AgileTab({ projectId, canWriteProject, onOpenTask }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '' });
  const [agileSection, setAgileSection] = useState('backlog');
  const [dragBacklogIndex, setDragBacklogIndex] = useState(null);

  const { data: sprints, isLoading: loadingSprints } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get(`/projects/${projectId}/sprints`).then((r) => r.data.sprints?.data || r.data.sprints || []),
  });

  const { data: backlog, isLoading: loadingBacklog } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => api.get(`/projects/${projectId}/backlog`).then((r) => r.data.tasks?.data || r.data.tasks || []),
  });

  const activeSprint = useMemo(
    () => (sprints || []).find((s) => s.status === 'active'),
    [sprints],
  );

  const plannedSprints = useMemo(
    () => (sprints || []).filter((s) => s.status === 'planned').sort((a, b) => (b.id || 0) - (a.id || 0)),
    [sprints],
  );

  const completedSprints = useMemo(
    () => (sprints || []).filter((s) => s.status === 'completed').sort((a, b) => {
      const ta = a.ended_at ? new Date(a.ended_at).getTime() : 0;
      const tb = b.ended_at ? new Date(b.ended_at).getTime() : 0;
      return tb - ta;
    }),
    [sprints],
  );

  const velocitySprints = useMemo(
    () => completedSprints.filter((s) => Number(s.velocity ?? s.completed_story_points ?? 0) > 0),
    [completedSprints],
  );

  const { data: sprintTasksRaw, isLoading: loadingSprintTasks } = useQuery({
    queryKey: ['sprint-tasks', projectId, activeSprint?.id],
    queryFn: () => api.get(`/projects/${projectId}/tasks?all=1&sprint_id=${activeSprint.id}`).then((r) => (
      r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? []
    )),
    enabled: Boolean(activeSprint?.id),
  });

  const sprintTasks = useMemo(() => {
    const list = sprintTasksRaw || [];
    return list.map((t) => ({
      ...t,
      workflow_status: normalizeWorkflowStatus(getTaskStatus(t)),
    }));
  }, [sprintTasksRaw]);

  const workflowMoveMutation = useMutation({
    mutationFn: ({ taskId, workflow_status }) =>
      api.put(`/tasks/${taskId}`, { workflow_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-tasks', projectId] });
    },
  });

  const createSprint = useMutation({
    mutationFn: (payload) => api.post(`/projects/${projectId}/sprints`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '' });
      toast.success('Sprint créé.');
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.message
        || (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' '))
        || 'Impossible de créer le sprint.';
      toast.error(msg);
    },
  });

  const startSprint = useMutation({
    mutationFn: (sprintId) => api.post(`/projects/${projectId}/sprints/${sprintId}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de démarrer le sprint'),
  });

  const completeSprint = useMutation({
    mutationFn: (sprintId) => api.post(`/projects/${projectId}/sprints/${sprintId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de terminer le sprint'),
  });

  const assignToSprint = useMutation({
    mutationFn: ({ sprintId, taskId }) => api.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-tasks', projectId] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Assignation impossible'),
  });

  const reorderBacklog = useMutation({
    mutationFn: (taskIds) => api.patch(`/projects/${projectId}/backlog/reorder`, { task_ids: taskIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backlog', projectId] }),
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur de réordonnancement'),
  });

  const handleBacklogReorder = (fromIndex, toIndex) => {
    const list = [...(backlog || [])];
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const [x] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, x);
    reorderBacklog.mutate(list.map((t) => t.id));
  };

  const sprintTasksByWorkflow = (columnId) =>
    sprintTasks
      .filter((t) => normalizeWorkflowStatus(getTaskStatus(t)) === columnId)
      .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

  const handleSprintDrop = (e, workflow) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!taskId) return;
    workflowMoveMutation.mutate({ taskId, workflow_status: workflow });
  };

  const handleSprintDragOver = (e) => e.preventDefault();

  const maxVelocity = Math.max(
    1,
    ...(velocitySprints.length ? velocitySprints.map((s) => Number(s.velocity ?? s.completed_story_points ?? 0)) : [0]),
  );

  const sprintStatusLabel = (s) => {
    if (s === 'planned') return 'Planifié';
    if (s === 'active') return 'En cours';
    if (s === 'completed') return 'Terminé';
    return s;
  };

  const sprintStatusBadgeClass = (s) => {
    if (s === 'planned') return 'bg-slate-200 text-slate-800';
    if (s === 'active') return 'bg-emerald-100 text-emerald-800';
    if (s === 'completed') return 'bg-blue-100 text-blue-800';
    return 'bg-secondary/20 text-secondary-foreground';
  };

  const renderSprintMetrics = (s) => {
    const done = s.tasks_done_count ?? 0;
    const total = s.tasks_count ?? 0;
    const rem = s.tasks_remaining_count ?? Math.max(0, total - done);
    const spDone = s.completed_story_points ?? 0;
    const spTot = s.total_story_points ?? 0;
    const spRem = s.remaining_story_points ?? Math.max(0, spTot - spDone);
    return { done, total, rem, spDone, spTot, spRem };
  };

  const SprintMetricsRow = ({ s }) => {
    const pct = s.progress_percent ?? 0;
    const m = renderSprintMetrics(s);
    return (
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{pct}%</span> avancement
          </span>
          <span>
            {m.spDone}/{m.spTot || '—'} pts story
          </span>
          <span>
            {m.done}/{m.total} tâches terminées
          </span>
          <span>
            {m.rem} restante{m.rem > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  };

  const sprintDropProps = (sprintId) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e) => {
      e.preventDefault();
      const tid = Number(e.dataTransfer.getData('taskId') || e.dataTransfer.getData('text/plain'));
      if (tid) assignToSprint.mutate({ sprintId, taskId: tid });
    },
  });

  const sprintSummaryLine = (s) => {
    if (!s) return '';
    if (s.start_date && s.end_date) return `${s.start_date} → ${s.end_date}`;
    if (s.start_date) return `Début : ${s.start_date}`;
    if (s.end_date) return `Fin : ${s.end_date}`;
    return 'Dates non définies';
  };

  return (
    <div className="space-y-8">
      {canWriteProject && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-1 font-semibold text-foreground">Nouveau sprint</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              La date de fin doit être après la date de début. Un seul sprint actif à la fois.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground" placeholder="Nom du sprint" value={newSprint.name} onChange={(e) => setNewSprint((s) => ({ ...s, name: e.target.value }))} />
              <input className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground" placeholder="Objectif" value={newSprint.goal} onChange={(e) => setNewSprint((s) => ({ ...s, goal: e.target.value }))} />
              <input className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground" type="date" value={newSprint.start_date} onChange={(e) => setNewSprint((s) => ({ ...s, start_date: e.target.value }))} />
              <input className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground" type="date" value={newSprint.end_date} onChange={(e) => setNewSprint((s) => ({ ...s, end_date: e.target.value }))} />
            </div>
            <div className="mt-4">
              <Button size="sm" onClick={() => createSprint.mutate(newSprint)} disabled={!newSprint.name || createSprint.isPending}>
                {createSprint.isPending ? 'Création…' : 'Créer le sprint'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingSprints ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {activeSprint && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sprint actif</h3>
              <div
                className={cn(
                  'rounded-xl border-2 border-primary/40 bg-primary/[0.06] p-4 shadow-sm dark:bg-primary/10',
                )}
                {...(canWriteProject && activeSprint ? sprintDropProps(activeSprint.id) : {})}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-foreground">{activeSprint.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activeSprint.start_date && activeSprint.end_date
                        ? `${activeSprint.start_date} → ${activeSprint.end_date}`
                        : 'Dates non définies'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{activeSprint.goal || '—'}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sprintStatusBadgeClass('active')}`}>
                    {sprintStatusLabel('active')}
                  </span>
                </div>
                <div className="mt-4">
                  <SprintMetricsRow s={activeSprint} />
                </div>
                {canWriteProject && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={completeSprint.isPending}
                      onClick={() => completeSprint.mutate(activeSprint.id)}
                    >
                      Terminer le sprint
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {plannedSprints.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Planifiés</h3>
              <div className="space-y-3">
                {plannedSprints.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border bg-card p-4"
                    {...(canWriteProject ? sprintDropProps(s.id) : {})}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{s.name}</p>
                        <div className="mt-3">
                          <SprintMetricsRow s={s} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{s.goal || 'Aucun objectif'}</p>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sprintStatusBadgeClass('planned')}`}>
                        {sprintStatusLabel('planned')}
                      </span>
                    </div>
                    {canWriteProject && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={startSprint.isPending} onClick={() => startSprint.mutate(s.id)}>
                          Démarrer le sprint
                        </Button>
                      </div>
                    )}
                    {canWriteProject && (
                      <p className="mt-2 text-[11px] text-muted-foreground">Déposez une tâche du backlog (onglet Backlog) sur cette carte pour l’assigner au sprint.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedSprints.length > 0 && (
            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                Sprints terminés ({completedSprints.length})
              </summary>
              <div className="space-y-3 border-t border-border px-4 pb-4 pt-2">
                {completedSprints.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${sprintStatusBadgeClass('completed')}`}>
                        Terminé
                      </span>
                    </div>
                    <div className="mt-2">
                      <SprintMetricsRow s={s} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {(!sprints || sprints.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun sprint pour ce projet.</p>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 font-semibold text-foreground">Vélocité (points terminés par sprint)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Basée sur les story points des tâches marquées terminées dans chaque sprint.</p>
          {loadingSprints ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : velocitySprints.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Pas encore de données : terminez au moins un sprint avec des tâches « terminées » pour afficher la vélocité.
            </p>
          ) : (
            <div className="space-y-3">
              {velocitySprints.map((s) => {
                const v = Number(s.velocity ?? s.completed_story_points ?? 0);
                const w = Math.min(100, Math.round((v / maxVelocity) * 100));
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs font-medium text-foreground">{s.name}</span>
                    <div className="h-2.5 min-w-0 flex-1 rounded-full bg-muted">
                      <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{v} pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setAgileSection('backlog')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            agileSection === 'backlog'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          Backlog
        </button>
        <button
          type="button"
          onClick={() => setAgileSection('sprint')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            agileSection === 'sprint'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          Sprint actif
        </button>
      </div>

      {agileSection === 'backlog' && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Backlog</h3>
                <p className="text-xs text-muted-foreground">
                  Priorité · story points · ordre par glisser-déposer. Assignation par boutons ou en déposant sur un sprint (ci-dessus).
                </p>
              </div>
            </div>
            {loadingBacklog ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (backlog || []).length === 0 ? (
              <EmptyState
                title="Backlog vide"
                description="Aucune tâche hors sprint pour ce projet. Créez une tâche ou retirez-en une d’un sprint."
              />
            ) : (
              <div className={`space-y-2 ${reorderBacklog.isPending ? 'opacity-70' : ''}`}>
                {(backlog || []).map((task, index) => {
                  const pr = task.priority || 'medium';
                  return (
                    <div
                      key={task.id}
                      draggable={canWriteProject}
                      onDragStart={(e) => {
                        setDragBacklogIndex(index);
                        const tid = String(task.id);
                        e.dataTransfer.setData('text/plain', tid);
                        e.dataTransfer.setData('taskId', tid);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dragged = Number(e.dataTransfer.getData('text/plain'));
                        const from = dragBacklogIndex;
                        if (from == null || Number.isNaN(dragged)) return;
                        handleBacklogReorder(from, index);
                        setDragBacklogIndex(null);
                      }}
                      className={cn(
                        'rounded-xl border border-border bg-card p-3 transition-shadow',
                        canWriteProject && 'cursor-grab active:cursor-grabbing hover:border-primary/30',
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          {canWriteProject && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  PRIORITY_COLORS[pr] || PRIORITY_COLORS.medium,
                                  'dark:ring-1 dark:ring-white/10',
                                )}
                              >
                                {PRIORITY_LABELS_FR[pr] || pr}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                                {task.story_points != null ? `${task.story_points} pts` : '— pts'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-foreground">{task.title}</p>
                          </div>
                        </div>
                        {canWriteProject && (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {(sprints || [])
                              .filter((s) => s.status === 'active' || s.status === 'planned')
                              .map((s) => (
                                <Button
                                  key={s.id}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 shrink-0 px-2 text-xs"
                                  disabled={assignToSprint.isPending}
                                  onClick={() => assignToSprint.mutate({ sprintId: s.id, taskId: task.id })}
                                  title={`Assigner à ${s.name}`}
                                >
                                  → {s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name}
                                </Button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {canWriteProject && (backlog || []).length > 1 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Glissez les lignes pour changer l’ordre (priorité visuelle). Glissez une ligne vers la carte « Sprint actif » ou « Planifiés » plus haut pour l’assigner.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {agileSection === 'sprint' && (
        <div className="space-y-3">
          {!activeSprint ? (
            <EmptyState
              icon={Layers}
              title="Aucun sprint actif"
              description="Démarrez un sprint planifié pour afficher le tableau Kanban filtré sur ce sprint."
            />
          ) : loadingSprintTasks ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{activeSprint.name}</span>
                <span>·</span>
                <span>{sprintSummaryLine(activeSprint)}</span>
              </div>
              {sprintTasks.length === 0 ? (
                <EmptyState
                  title="Aucune tâche dans ce sprint"
                  description="Assignez des tâches depuis le backlog ou déplacez-les vers ce sprint."
                />
              ) : (
                <KanbanBoard
                  columns={WORKFLOW_COLUMNS}
                  tasksByWorkflow={sprintTasksByWorkflow}
                  onDrop={handleSprintDrop}
                  onDragOver={handleSprintDragOver}
                  onAddTask={() => {}}
                  onEditTask={(task) => onOpenTask?.(task)}
                  canWriteProject={canWriteProject}
                  isAdmin={isAdmin}
                  movePending={workflowMoveMutation.isPending}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
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
                    <UserAvatar name={actorName} size="sm" className="shrink-0" />
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
  canWriteProject,
  isAdmin,
  movePending,
}) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${movePending ? 'opacity-70' : ''}`}>
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-accent/30"
          onDrop={(e) => canWriteProject && onDrop(e, col.id)}
          onDragOver={onDragOver}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  col.id === 'done'
                    ? 'bg-emerald-500'
                    : col.id === 'in_progress'
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                }`}
              />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {tasksByWorkflow(col.id).length}
              </span>
            </div>
            {canWriteProject && (
              <button
                type="button"
                onClick={() => onAddTask(col.id)}
                className="rounded p-1 hover:bg-accent"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {tasksByWorkflow(col.id).map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onClick={() => onEditTask(task)}
                canWriteTask={canWriteProject && (isAdmin || task?.access?.can_edit !== false)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ task, onClick, canWriteTask }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  const wf = normalizeWorkflowStatus(getTaskStatus(task));
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
      className={`cursor-pointer rounded-lg border border-border border-l-4 ${borderAccent} bg-card p-3 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
        {canWriteTask && <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
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
          {(task.assignees || []).slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary/15 text-xs font-semibold text-primary"
              title={a.name || a.user?.name}
            >
              {(a.name || a.user?.name || '?')[0]}
            </div>
          ))}
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
    </motion.div>
  );
}

function MembersTab({ projectId, canEditProject, canInvite, onOpenInvite }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [role, setRole] = useState('member');
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch.trim()), 150);
    return () => clearTimeout(t);
  }, [userSearch]);

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

  const searchReady = debouncedSearch.length >= 2;

  const { data: searchUsers = [], isFetching: searchLoading } = useQuery({
    queryKey: ['project-user-search', projectId, debouncedSearch],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/user-search`, { params: { search: debouncedSearch } })
        .then((r) => {
          const raw = r.data?.users ?? r.data?.data ?? [];
          return Array.isArray(raw) ? raw : [];
        }),
    enabled: showAdd && canEditProject && searchReady,
    staleTime: 20_000,
  });

  const trimmedInput = userSearch.trim();
  const waitingDebounce = trimmedInput.length >= 2 && !searchReady;

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setShowAdd(false);
      setUserSearch('');
      setDebouncedSearch('');
      setSelectedUser(null);
      setDropdownOpen(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/projects/${projectId}/members/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">Membres du projet</h3>
        <div className="flex flex-wrap gap-2">
          {canInvite && (
            <Button size="sm" variant="outline" onClick={onOpenInvite}>
              <Mail className="mr-1 h-4 w-4" /> Inviter par e-mail
            </Button>
          )}
          {canEditProject && (
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
            </Button>
          )}
        </div>
      </div>

      {showAdd && canEditProject && (
        <Card className="overflow-visible">
          <CardContent className="flex flex-col gap-4 overflow-visible p-4 sm:flex-row sm:items-end">
            <div className="relative z-20 min-w-0 flex-1" ref={searchWrapRef}>
              <label className="mb-1 block text-sm font-medium">Utilisateur</label>
              {selectedUser ? (
                <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{selectedUser.name}</span>
                    <span className="text-muted-foreground"> · {selectedUser.email}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-primary hover:underline"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearch('');
                      setDebouncedSearch('');
                      setDropdownOpen(false);
                    }}
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
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setDropdownOpen(false);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                    placeholder="Rechercher par nom ou e-mail…"
                    aria-autocomplete="list"
                    aria-expanded={dropdownOpen}
                    aria-controls="project-member-user-suggestions"
                  />
                  {dropdownOpen && (
                    <div
                      id="project-member-user-suggestions"
                      role="listbox"
                      className="absolute left-0 right-0 z-[200] mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                    >
                      {trimmedInput.length < 2 && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">
                          Tapez au moins <strong className="text-foreground">2 caractères</strong> pour afficher les
                          utilisateurs pas encore dans ce projet.
                        </p>
                      )}
                      {trimmedInput.length >= 2 && waitingDebounce && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">Recherche…</p>
                      )}
                      {trimmedInput.length >= 2 && searchReady && searchLoading && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">Chargement…</p>
                      )}
                      {trimmedInput.length >= 2 && searchReady && !searchLoading && searchUsers.length === 0 && (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">
                          Aucun utilisateur disponible (déjà membre ou aucune correspondance).
                        </p>
                      )}
                      {trimmedInput.length >= 2 &&
                        searchReady &&
                        !searchLoading &&
                        searchUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            role="option"
                            className="block w-full border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserSearch('');
                              setDebouncedSearch('');
                              setDropdownOpen(false);
                            }}
                          >
                            <span className="font-medium text-foreground">{u.name}</span>
                            <span className="block text-xs text-muted-foreground">{u.email}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="sm:w-44">
              <label className="mb-1 block text-sm font-medium">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="admin">{PROJECT_ROLE_LABELS.admin}</option>
                <option value="member">{PROJECT_ROLE_LABELS.member}</option>
                <option value="client">{PROJECT_ROLE_LABELS.client}</option>
              </select>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => selectedUser && addMutation.mutate({ user_id: selectedUser.id, project_role: role })}
              disabled={!selectedUser || addMutation.isPending}
            >
              Ajouter
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                {m.name?.[0] || m.user?.name?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{m.name || m.user?.name}</p>
                <p className="text-xs text-muted-foreground">{m.email || m.user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {formatProjectRole(m.role || m.project_role || m.pivot?.project_role || 'member')}
              </Badge>
              {canEditProject && (
                <button
                onClick={() => {
                  if (window.confirm('Retirer ce membre ?')) {
                    removeMutation.mutate(m.id);
                  }
                }}
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive"
              >
                ×
              </button>
              )}
            </div>
          </div>
        ))}
        {members?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun membre ajouté</p>
        )}
      </div>
    </div>
  );
}

