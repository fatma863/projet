import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import TaskModal from './TaskModal';
import {
  ArrowLeft, Plus, GripVertical, Clock, User, AlertTriangle,
  BarChart3, Users, Calendar,
} from 'lucide-react';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  planning: 'Planification',
  active: 'Actif',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [taskModal, setTaskModal] = useState({ open: false, task: null, statusId: null });
  const [tab, setTab] = useState('kanban');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data.data),
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', id],
    queryFn: () => api.get(`/projects/${id}/statuses`).then((r) => r.data.data),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/projects/${id}/tasks?all=1`).then((r) => r.data.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data),
  });
  const { data: activities } = useQuery({
    queryKey: ['project-activity', id],
    queryFn: () => api.get(`/projects/${id}/activity?per_page=30`).then((r) => r.data.activities?.data || r.data.activities || []),
  });

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
        <Button onClick={() => setTaskModal({ open: true, task: null, statusId: statuses?.[0]?.id })}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle tâche
        </Button>
      </div>

      {/* Stats bar */}
      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Total tâches" value={dashboard.total_tasks} />
          <MiniStat label="Terminées" value={dashboard.completed_tasks} />
          <MiniStat label="En retard" value={dashboard.overdue_tasks} color="text-destructive" />
          <MiniStat label="Progression moy." value={`${dashboard.avg_progress || 0}%`} />
          <MiniStat label="Heures estimées" value={dashboard.total_estimated_hours || 0} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'kanban', label: 'Kanban' },
          { key: 'agile', label: 'Agile' },
          { key: 'members', label: 'Membres' },
          { key: 'activity', label: 'Activité' },
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
        />
      )}

      {tab === 'members' && <MembersTab projectId={id} />}
      {tab === 'agile' && <AgileTab projectId={id} />}
      {tab === 'activity' && <ActivityTab activities={activities || []} />}

      {/* Task Modal */}
      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, statusId: null })}
        projectId={parseInt(id)}
        task={taskModal.task}
        defaultStatusId={taskModal.statusId}
        statuses={statuses || []}
      />
    </div>
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

function AgileTab({ projectId }) {
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
                    {s.status !== 'active' && s.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => startSprint.mutate(s.id)}>Démarrer</Button>
                    )}
                    {s.status === 'active' && (
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

function KanbanBoard({ statuses, tasksByStatus, onDrop, onDragOver, onAddTask, onEditTask }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => (
        <div
          key={status.id}
          className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-accent/30"
          onDrop={(e) => onDrop(e, status.id)}
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
            <button
              onClick={() => onAddTask(status.id)}
              className="rounded p-1 hover:bg-accent"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {tasksByStatus(status.id).map((task) => (
              <KanbanCard key={task.id} task={task} onClick={() => onEditTask(task)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ task, onClick }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between">
        <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>
          {task.priority}
        </span>

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

function MembersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('developer');

  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => r.data.data),
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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Membres du projet</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      {showAdd && (
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
                <option value="owner">Propriétaire</option>
                <option value="manager">Manager</option>
                <option value="developer">Développeur</option>
                <option value="designer">Designer</option>
                <option value="tester">Testeur</option>
                <option value="viewer">Observateur</option>
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
              <Badge variant="secondary">{m.project_role || m.pivot?.project_role || 'member'}</Badge>
              <button
                onClick={() => {
                  if (window.confirm('Retirer ce membre ?')) {
                    removeMutation.mutate(m.id || m.user_id);
                  }
                }}
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive"
              >
                ×
              </button>
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
