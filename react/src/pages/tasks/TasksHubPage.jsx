import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { TaskCard } from '../../components/tasks/TaskCard';
import { WorkflowBoard } from '../../components/tasks/WorkflowBoard';
import { LayoutList, Columns3, Filter } from 'lucide-react';

function parseTasks(res) {
  const raw = res.data.tasks;
  if (Array.isArray(raw)) return raw;
  return raw?.data || [];
}

export default function TasksHubPage() {
  const { user } = useAuth();
  const isViewer = user?.roles?.includes('viewer');
  const [tab, setTab] = useState('list');
  const [projectId, setProjectId] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [search, setSearch] = useState('');

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
    return p.toString();
  }, [projectId, workflowStatus, priority, assigneeId, search]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks-global', queryParams],
    queryFn: () => api.get(`/tasks?${queryParams}`).then(parseTasks),
  });

  const userOptions = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const u = a.user || a;
        if (u?.id) map.set(u.id, u.name || `User ${u.id}`);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tâches</h1>
          <p className="text-muted-foreground">Liste globale et flux (workflow)</p>
        </div>
        <div className="flex rounded-lg border border-border bg-card p-1">
          <Button
            type="button"
            variant={tab === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setTab('list')}
          >
            <LayoutList size={16} /> Liste
          </Button>
          <Button
            type="button"
            variant={tab === 'board' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setTab('board')}
          >
            <Columns3 size={16} /> Flux
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Filter size={16} />
            Filtres
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Projet</label>
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Tous</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Workflow</label>
              <Select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)}>
                <option value="">Tous</option>
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
                <option value="at_risk">À risque</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Priorité</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Toutes</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Assigné</label>
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Tous</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Recherche</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Titre, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {tab === 'list' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : !tasks?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune tâche ne correspond aux filtres.
              </CardContent>
            </Card>
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
        <WorkflowBoard tasks={tasks} loading={isLoading} readOnly={isViewer} />
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
