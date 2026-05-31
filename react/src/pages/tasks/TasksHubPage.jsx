import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardContent } from '../../components/ui/Card';
import { TaskCard } from '../../components/tasks/TaskCard';
import { SkeletonTaskRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { WorkflowBoard } from '../../components/tasks/WorkflowBoard';
import { DueDateRangeFilter } from '../../components/tasks/DueDateRangeFilter';
import { LayoutList, Columns3, Filter, ListTodo, Plus, RotateCcw } from 'lucide-react';
import { isGuestViewer } from '../../lib/roles';

function parseTasks(res) {
  const raw = res.data.tasks;
  if (Array.isArray(raw)) return raw;
  return raw?.data || [];
}

export default function TasksHubPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isViewer = isGuestViewer(user);
  const isAdmin = user?.roles?.includes('admin');
  const isMember = !isViewer && !isAdmin;
  const [tab, setTab] = useState('list');
  const [projectId, setProjectId] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [priority, setPriority] = useState('');
  // Members see only their own tasks by default; '' means "all" for admin/viewer
  const [assigneeId, setAssigneeId] = useState(() => (isMember && user?.id ? String(user.id) : ''));
  const [search, setSearch] = useState('');
  const [dueRange, setDueRange] = useState({ due_from: '', due_to: '' });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data || []),
  });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('all', '1');
    if (projectId) p.set('project_id', projectId);
    if (workflowStatus) p.set('workflow_status', workflowStatus);
    if (priority) p.set('priority', priority);
    if (assigneeId) p.set('assignee_id', assigneeId);
    if (search.trim()) p.set('search', search.trim());
    if (dueRange.due_from) p.set('due_from', dueRange.due_from);
    if (dueRange.due_to) p.set('due_to', dueRange.due_to);
    return p.toString();
  }, [projectId, workflowStatus, priority, assigneeId, search, dueRange]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks-global', queryParams],
    queryFn: () => api.get(`/tasks?${queryParams}`).then(parseTasks),
  });

  const userOptions = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const u = a.user || a;
        if (u?.id) map.set(u.id, u.name || `Utilisateur ${u.id}`);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const resetFilters = () => {
    setProjectId('');
    setWorkflowStatus('');
    setPriority('');
    // Members reset to their own tasks; admins reset to all
    setAssigneeId(isMember && user?.id ? String(user.id) : '');
    setSearch('');
    setDueRange({ due_from: '', due_to: '' });
  };

  const resetViewerFilters = () => {
    setProjectId('');
    setWorkflowStatus('');
    setDueRange({ due_from: '', due_to: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">
            {isViewer
              ? t('tasks.subtitleViewer')
              : isMember
                ? t('tasks.subtitleMember')
                : t('tasks.subtitleAdmin')}
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-card p-1">
          <Button
            type="button"
            variant={tab === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setTab('list')}
          >
            <LayoutList size={16} /> {t('tasks.listView')}
          </Button>
          <Button
            type="button"
            variant={tab === 'board' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setTab('board')}
          >
            <Columns3 size={16} /> {t('tasks.kanbanView')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Filter size={16} aria-hidden />
              {t('common.filter')}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={isViewer ? resetViewerFilters : resetFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t('tasks.resetFilters')}
            </Button>
          </div>
          {isViewer ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('projects.title')}</label>
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">{t('tasks.allProjects')}</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('tasks.workflow')}</label>
                <Select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)}>
                  <option value="">{t('tasks.allStatuses')}</option>
                  <option value="todo">{t('tasks.workflows.todo')}</option>
                  <option value="in_progress">{t('tasks.workflows.in_progress')}</option>
                  <option value="done">{t('tasks.workflows.done')}</option>
                  <option value="at_risk">{t('dashboard.atRiskShort')}</option>
                </Select>
              </div>
              <DueDateRangeFilter
                className="sm:col-span-2 lg:col-span-1"
                idPrefix="tasks-hub-due-viewer"
                value={dueRange}
                onChange={setDueRange}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('projects.title')}</label>
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">{t('tasks.allProjects')}</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('tasks.workflow')}</label>
                <Select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)}>
                  <option value="">{t('tasks.allStatuses')}</option>
                  <option value="todo">{t('tasks.workflows.todo')}</option>
                  <option value="in_progress">{t('tasks.workflows.in_progress')}</option>
                  <option value="done">{t('tasks.workflows.done')}</option>
                  <option value="at_risk">{t('dashboard.atRiskShort')}</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('tasks.priority')}</label>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">{t('tasks.allPriorities')}</option>
                  <option value="low">{t('tasks.priorities.low')}</option>
                  <option value="medium">{t('tasks.priorities.medium')}</option>
                  <option value="high">{t('tasks.priorities.high')}</option>
                  <option value="urgent">{t('tasks.priorities.urgent')}</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t('tasks.assignee')}{isMember && <span className="ml-1 text-primary">({t('tasks.myTasksFilter')})</span>}
                </label>
                <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {isMember && user?.id && (
                    <option value={String(user.id)}>{t('tasks.myTasksFilter')} ({user.name})</option>
                  )}
                  {userOptions
                    .filter((u) => !isMember || String(u.id) !== String(user?.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('common.search')}</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('tasks.searchTasks')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DueDateRangeFilter
                className="sm:col-span-2 md:col-span-3 xl:col-span-2"
                idPrefix="tasks-hub-due"
                value={dueRange}
                onChange={setDueRange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {tab === 'list' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTaskRow key={i} />
              ))}
            </div>
          ) : !tasks?.length ? (
            <EmptyState
              icon={ListTodo}
              title={t('tasks.noTasks')}
              description={
                isViewer
                  ? t('tasks.subtitleViewer')
                  : t('tasks.subtitleMember')
              }
            >
              {!isViewer && (
                <Link
                  to="/projects"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {t('tasks.newTask')}
                </Link>
              )}
            </EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} draggable={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'board' && (
        <WorkflowBoard tasks={tasks} loading={isLoading} />
      )}

      <p className="text-xs text-muted-foreground">
        Le flux utilise les statuts <strong>workflow</strong> (à faire, en cours, terminé, à risque), distincts des colonnes Kanban du projet.{' '}
        <Link to="/projects" className="text-primary hover:underline">
          Ouvrir un projet
        </Link>{' '}
        pour le tableau Kanban détaillé.
      </p>
    </div>
  );
}
