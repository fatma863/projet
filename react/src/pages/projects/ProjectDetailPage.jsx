import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import TaskModal from './TaskModal';
import { PROJECT_ROLE_LABELS, formatProjectRole } from '../../lib/roles';
import {
  ArrowLeft, Plus, GripVertical, Clock, User, AlertTriangle,
  BarChart3, Users, Calendar, Mail,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
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

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();

  const queryClient = useQueryClient();
  const [taskModal, setTaskModal] = useState({ open: false, task: null, statusId: null });
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
    queryFn: () => api.get(`/projects/${id}/tasks?all=1`).then((r) => (
      r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? []
    )),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data),
  });
  const { data: activities } = useQuery({
    queryKey: ['project-activity', id],
    queryFn: () => api.get(`/projects/${id}/activity?per_page=30`).then((r) => (
      r.data?.activities?.data ?? r.data?.activities ?? r.data?.data?.activities ?? []
    )),
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

    channel.listen('.activity.logged', (payload) => {
      if (!payload.activity) return;
      queryClient.setQueryData(['project-activity', id], (current = []) => {
        if (current.some((item) => item.id === payload.activity.id)) return current;
        return [payload.activity, ...current].slice(0, 30);
      });
    });

    channel.listen('.task.comment.created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    });

    return () => {
      echo.leave(`private-project.${id}`);
    };
  }, [id, queryClient]);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, statusId, order }) =>
      api.patch(`/tasks/${taskId}/move`, { status_id: statusId, kanban_order: order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
  });

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

  const tasksByStatus = (statusId) =>
    (tasks || []).filter((t) => t.status_id === statusId).sort((a, b) => a.kanban_order - b.kanban_order);

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const tasksInColumn = tasksByStatus(statusId);
    const order = tasksInColumn.length;
    moveMutation.mutate({ taskId, statusId, order });
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
          {canInvite && (
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Inviter
            </Button>
          )}
          {canWriteProject && (
            <Button onClick={() => setTaskModal({ open: true, task: null, statusId: statuses?.[0]?.id })}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle tâche
            </Button>
          )}
        </div>
      </div>

      {!canWriteProject && (
        <div className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Lecture seule.</strong>{' '}
          {access.is_guest
            ? 'Rôle invité sur ce projet : consultation des tâches et commentaires uniquement.'
            : 'Vous consultez ce projet sans droits de modification sur les tâches.'}
        </div>
      )}

      {/* Stats bar */}
      {dashboard && (
        <div>
          {isAdmin && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget & suivi</p>
          )}
          <div className={`grid gap-3 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            <MiniStat label="Total tâches" value={dashboard.total_tasks} />
            <MiniStat label="Terminées" value={dashboard.completed_tasks} />
            <MiniStat label="En retard" value={dashboard.overdue_tasks} color="text-destructive" />
            <MiniStat label="Progression moy." value={`${dashboard.avg_progress || 0}%`} />
            {isAdmin ? (
              <>
                <MiniStat
                  label="Coût estimé"
                  value={dashboard.estimated_cost ?? 0}
                />
                <MiniStat
                  label="Coût réel"
                  value={dashboard.actual_cost ?? 0}
                />
              </>
            ) : (
              <MiniStat label="Heures estimées" value={dashboard.total_estimated_hours || 0} />
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'kanban', label: 'Kanban' },
          { key: 'agile', label: 'Agile' },
          { key: 'members', label: 'Membres' },
          { key: 'activity', label: 'Activité' },
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
        <KanbanBoard
          statuses={statuses || []}
          tasksByStatus={tasksByStatus}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onAddTask={(statusId) => setTaskModal({ open: true, task: null, statusId })}
          onEditTask={(task) => setTaskModal({ open: true, task, statusId: task.status_id })}
          canWriteProject={canWriteProject}
          isAdmin={isAdmin}
        />
      )}

      {tab === 'members' && (
        <MembersTab projectId={id} canEditProject={canEditProject} canInvite={canInvite} onOpenInvite={() => setInviteOpen(true)} />
      )}
      {tab === 'agile' && <AgileTab projectId={id} canWriteProject={canEditProject} />}
      {tab === 'activity' && <ActivityTab activities={activities || []} />}
      {tab === 'gantt' && (
        <div className="pt-4">
          {loadingGantt ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <GanttChart tasks={ganttData || []} />
          )}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, statusId: null })}
        projectId={parseInt(id)}
        task={taskModal.task}
        defaultStatusId={taskModal.statusId}
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
        }}
      />
    </div>
  );
}

function InviteUserModal({ open, onClose, projectId, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => api.post(`/projects/${projectId}/invite`, payload),
    onSuccess: () => {
      onInvited?.();
      onClose();
      setEmail('');
      setRole('member');
      setError(null);
    },
    onError: (e) => {
      setError(e.response?.data?.message || e.message || 'Erreur');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Inviter un utilisateur" size="md">
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
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
            <option value="guest">{PROJECT_ROLE_LABELS.guest}</option>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Membre : tâches et commentaires. Invité : lecture seulement.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            type="button"
            disabled={!email.trim() || mutation.isPending}
            onClick={() => mutation.mutate({ email: email.trim(), role })}
          >
            {mutation.isPending ? 'Envoi…' : 'Envoyer l’invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ActivityTab({ activities }) {
  if (!activities.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité pour le moment</p>;
  }

  return (
    <div className="space-y-2">
      {activities.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {entry.actor?.name || 'Système'} <span className="font-normal text-muted-foreground">{entry.action}</span>
              </p>
              {entry.meta?.task_title && (
                <p className="text-xs text-muted-foreground">{entry.meta.task_title}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.created_at).toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgileTab({ projectId, canWriteProject }) {
  const queryClient = useQueryClient();
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '' });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get(`/projects/${projectId}/sprints`).then((r) => r.data.sprints?.data || r.data.sprints || []),
  });
  const { data: backlog } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => api.get(`/projects/${projectId}/backlog`).then((r) => r.data.tasks?.data || r.data.tasks || []),
  });

  const createSprint = useMutation({
    mutationFn: (payload) => api.post(`/projects/${projectId}/sprints`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '' });
    },
  });
  const startSprint = useMutation({
    mutationFn: (sprintId) => api.post(`/projects/${projectId}/sprints/${sprintId}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });
  const endSprint = useMutation({
    mutationFn: (sprintId) => api.post(`/projects/${projectId}/sprints/${sprintId}/end`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });
  const assignToSprint = useMutation({
    mutationFn: ({ sprintId, taskId }) => api.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  return (
    <div className="space-y-6">
      {canWriteProject && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold text-foreground">Créer un sprint</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Nom sprint" value={newSprint.name} onChange={(e) => setNewSprint((s) => ({ ...s, name: e.target.value }))} />
              <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Objectif" value={newSprint.goal} onChange={(e) => setNewSprint((s) => ({ ...s, goal: e.target.value }))} />
              <input className="h-10 rounded-md border border-input px-3 text-sm" type="date" value={newSprint.start_date} onChange={(e) => setNewSprint((s) => ({ ...s, start_date: e.target.value }))} />
              <input className="h-10 rounded-md border border-input px-3 text-sm" type="date" value={newSprint.end_date} onChange={(e) => setNewSprint((s) => ({ ...s, end_date: e.target.value }))} />
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => createSprint.mutate(newSprint)} disabled={!newSprint.name || createSprint.isPending}>
                Créer sprint
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold text-foreground">Sprints</h3>
            <div className="space-y-2">
              {(sprints || []).map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.goal || 'Aucun objectif'}</p>
                    </div>
                    <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {canWriteProject && s.status !== 'active' && s.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => startSprint.mutate(s.id)}>Démarrer</Button>
                    )}
                    {canWriteProject && s.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => endSprint.mutate(s.id)}>Terminer</Button>
                    )}
                  </div>
                </div>
              ))}
              {(sprints || []).length === 0 && <p className="text-sm text-muted-foreground">Aucun sprint</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold text-foreground">Backlog</h3>
            <div className="space-y-2">
              {(backlog || []).map((task) => (
                <div key={task.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">SP: {task.story_points ?? 0}</p>
                    </div>
                    <select
                      className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                      defaultValue=""
                      disabled={!canWriteProject}
                      onChange={(e) => {
                        const sprintId = Number(e.target.value);
                        if (sprintId) assignToSprint.mutate({ sprintId, taskId: task.id });
                      }}
                    >
                      <option value="">Assigner sprint...</option>
                      {(sprints || []).filter((s) => s.status !== 'completed').map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {(backlog || []).length === 0 && <p className="text-sm text-muted-foreground">Backlog vide</p>}
            </div>
          </CardContent>
        </Card>
      </div>
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

function KanbanBoard({ statuses, tasksByStatus, onDrop, onDragOver, onAddTask, onEditTask, canWriteProject, isAdmin }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => (
        <div
          key={status.id}
          className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-accent/30"
          onDrop={(e) => canWriteProject && onDrop(e, status.id)}
          onDragOver={onDragOver}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: status.color || '#6b7280' }}
              />
              <span className="text-sm font-semibold text-foreground">{status.name}</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {tasksByStatus(status.id).length}
              </span>
            </div>
            {canWriteProject && (
              <button
                onClick={() => onAddTask(status.id)}
                className="rounded p-1 hover:bg-accent"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {tasksByStatus(status.id).map((task) => (
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

  return (
    <div
      draggable={canWriteTask}
      onDragStart={canWriteTask ? handleDragStart : undefined}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
        {canWriteTask && <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>
          {task.priority}
        </span>

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
            Risque {task.risk_level === 'high' ? 'élevé' : task.risk_level === 'medium' ? 'moyen' : 'faible'}
          </span>
        )}

        {task.is_overdue && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> Retard
          </span>
        )}

        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Footer: assignees + progress */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex -space-x-1">
          {task.assignees?.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary/20 text-xs font-medium text-primary"
              title={a.user?.name || a.name}
            >
              {(a.user?.name || a.name || '?')[0]}
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
    </div>
  );
}

function MembersTab({ projectId, canEditProject, canInvite, onOpenInvite }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('member');

  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => (
      r.data?.members?.data ?? r.data?.members ?? []
    )),
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setShowAdd(false);
      setUserId('');
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
              <Plus className="mr-1 h-4 w-4" /> Ajouter (ID)
            </Button>
          )}
        </div>
      </div>

      {showAdd && canEditProject && (
        <Card>
          <CardContent className="flex items-end gap-3 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">ID utilisateur</label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                placeholder="ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="admin">{PROJECT_ROLE_LABELS.admin}</option>
                <option value="member">{PROJECT_ROLE_LABELS.member}</option>
                <option value="guest">{PROJECT_ROLE_LABELS.guest}</option>
              </select>
            </div>
            <Button
              size="sm"
              onClick={() => addMutation.mutate({ user_id: parseInt(userId), project_role: role })}
              disabled={!userId || addMutation.isPending}
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

function GanttChart({ tasks }) {
  const { minDate, totalDays, months } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    (tasks || []).forEach((t) => {
      if (t.start) min = Math.min(min, new Date(t.start).getTime());
      if (t.end) max = Math.max(max, new Date(t.end).getTime());
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minDate: 0, totalDays: 1, months: [] };
    }
    // Add padding to make bars visible at edges.
    const pad = 2 * 86400000;
    min -= pad;
    max += pad;
    const totalDays = Math.max(1, Math.ceil((max - min) / 86400000));
    const minD = new Date(min);
    const maxD = new Date(max);

    const months = [];
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cursor <= maxD) {
      const offset = Math.max(0, (cursor.getTime() - min) / 86400000);
      months.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        offset,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { minDate: min, totalDays, months };
  }, [tasks]);

  const taskRows = useMemo(() => (tasks || []).map((task, index) => ({ ...task, rowIndex: index })), [tasks]);
  const byId = useMemo(() => {
    const map = new Map();
    taskRows.forEach((t) => map.set(t.id, t));
    return map;
  }, [taskRows]);

  const getBarMetrics = (task) => {
    if (!task.start || !task.end) return null;
    const startOffset = (new Date(task.start).getTime() - minDate) / 86400000;
    const duration = Math.max(1, (new Date(task.end).getTime() - new Date(task.start).getTime()) / 86400000 + 1);
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    return { left, width };
  };

  const dependencies = (() => {
    const lines = [];
    taskRows.forEach((task) => {
      const to = getBarMetrics(task);
      if (!to || !task.dependencies?.length) return;
      task.dependencies.forEach((dep) => {
        const fromTask = byId.get(dep.id);
        const from = fromTask ? getBarMetrics(fromTask) : null;
        if (!from || !fromTask) return;
        lines.push({
          key: `${dep.id}-${task.id}-${dep.type || 'dep'}`,
          x1: from.left + from.width,
          y1: fromTask.rowIndex * 36 + 18,
          x2: to.left,
          y2: task.rowIndex * 36 + 18,
          critical: task.is_critical && fromTask.is_critical,
        });
      });
    });
    return lines;
  })();

  if (!tasks?.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aucune tâche avec dates planifiées
      </div>
    );
  }

  const rowHeight = 36;
  const chartHeight = taskRows.length * rowHeight;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      {/* Month headers */}
      <div className="relative h-8 border-b border-border bg-accent/30">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 border-l border-border px-2 text-xs font-medium text-muted-foreground leading-8"
            style={{ left: `${(m.offset / totalDays) * 100}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute left-56 right-0 top-0 z-10" style={{ height: `${chartHeight}px` }}>
          {dependencies.map((line) => (
            <line
              key={line.key}
              x1={`${line.x1}%`}
              y1={line.y1}
              x2={`${line.x2}%`}
              y2={line.y2}
              stroke={line.critical ? '#dc2626' : '#64748b'}
              strokeWidth={line.critical ? 2.5 : 1.5}
              strokeDasharray={line.critical ? '0' : '4 3'}
            />
          ))}
        </svg>

        <div>
          {taskRows.map((task) => {
            const metrics = getBarMetrics(task);
            return (
              <div key={task.id} className="flex border-b border-border last:border-0">
                {/* Task name */}
                <div className="flex w-56 flex-shrink-0 items-center gap-2 border-r border-border px-3 py-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: task.status_color || '#6b7280' }}
                  />
                  <span className="truncate text-sm text-foreground" title={task.name}>
                    {task.name}
                  </span>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 py-2" style={{ minHeight: '36px' }}>
                  {metrics ? (
                    <div
                      className={`absolute top-2 z-20 h-6 rounded ${task.is_critical ? 'ring-2 ring-red-600 ring-offset-1' : ''}`}
                      style={{
                        left: `${metrics.left}%`,
                        width: `${metrics.width}%`,
                        backgroundColor: task.is_critical ? '#dc2626' : (task.status_color || '#6366f1'),
                        opacity: 0.85,
                      }}
                      title={task.is_critical ? 'Chemin critique' : undefined}
                    >
                      {task.progress > 0 && (
                        <div
                          className="h-full rounded bg-black/20"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                        {task.progress}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-6 items-center px-2">
                      <span className="text-xs text-muted-foreground italic">Pas de dates</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
