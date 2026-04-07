import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { CalendarView } from '../../components/calendar/CalendarView';
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';

function rangeForView(view, anchor) {
  const a = new Date(anchor);
  if (view === 'week') {
    const start = new Date(a);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }
  const from = new Date(a.getFullYear(), a.getMonth(), 1);
  const to = new Date(a.getFullYear(), a.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [detail, setDetail] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  const { from, to } = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data || []),
  });

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set('from', from);
    p.set('to', to);
    if (projectId) p.set('project_id', projectId);
    if (userId) p.set('user_id', userId);
    return p.toString();
  }, [from, to, projectId, userId]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendar', params],
    queryFn: () => api.get(`/calendar?${params}`).then((r) => r.data.tasks || []),
  });

  const userOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      (t.assignees || []).forEach((u) => {
        if (u?.id) map.set(u.id, u.name);
      });
      if (t.user?.id) map.set(t.user.id, t.user.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const stats = useMemo(() => {
    const projectSet = new Set();
    tasks.forEach((t) => {
      if (t?.project?.id) projectSet.add(t.project.id);
    });
    return {
      tasks: tasks.length,
      projects: projectSet.size,
      users: userOptions.length,
    };
  }, [tasks, userOptions.length]);

  const shift = (dir) => {
    const d = new Date(anchor);
    if (view === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setMonth(d.getMonth() + dir);
    }
    setAnchor(d);
  };

  const title =
    view === 'week'
      ? `Semaine du ${new Date(from).toLocaleDateString('fr-FR')}`
      : anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendrier</h1>
          <p className="text-muted-foreground">Échéances et jalons par période</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setView('month')}>
            Mois
          </Button>
          <Button type="button" variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>
            Semaine
          </Button>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card px-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium">{title}</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Filtres</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit shrink-0 gap-1.5"
            onClick={() => {
              setProjectId('');
              setUserId('');
              setAnchor(new Date());
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Réinitialiser les filtres
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <label className="mb-1 block text-xs text-muted-foreground">Utilisateur</label>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Tous</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2 text-xs text-muted-foreground">
            <CalendarDays className="mb-2 h-4 w-4" />
            <span>
              Chaque projet possède une couleur dédiée. Cliquez sur Voir tout pour afficher tous les projets du jour.
            </span>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
              <span className="rounded-full border border-border bg-card px-2 py-1 font-medium text-foreground">
                {stats.tasks} tâches
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-1 font-medium text-foreground">
                {stats.projects} projets
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-1 font-medium text-foreground">
                {stats.users} utilisateurs
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (
            <CalendarView
              tasks={tasks}
              view={view}
              anchorDate={anchor}
              onOpenDay={(payload) => setDayDetail(payload)}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        title={dayDetail ? `Tous les projets - ${dayDetail.dateLabel}` : ''}
        size="lg"
      >
        {dayDetail && (
          <div className="space-y-4">
            {dayDetail.projects.map((project) => (
              <div
                key={project.projectId || project.projectName}
                className="rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${project.style?.dot || 'bg-slate-500'}`} />
                    <p className="font-semibold text-foreground">{project.projectName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{project.tasks.length} tâche(s)</span>
                </div>

                <div className="space-y-2">
                  {project.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        setDayDetail(null);
                        setDetail(task);
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <div className="font-medium text-foreground">{task.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Échéance: {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR') : '—'}
                        {' · '}
                        {task.workflow_status || task.status || 'todo'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Projet : </span>
              {detail.project ? (
                <Link to={`/projects/${detail.project.id}`} className="text-primary hover:underline">
                  {detail.project.name}
                </Link>
              ) : (
                '—'
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Échéance : </span>
              {detail.deadline ? new Date(detail.deadline).toLocaleDateString('fr-FR') : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Début / fin : </span>
              {detail.start_date || '—'} → {detail.end_date || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Workflow : </span>
              {detail.workflow_status || detail.status}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
