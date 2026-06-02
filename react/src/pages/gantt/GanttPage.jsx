import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BarChart3, CalendarRange, Sparkles, RotateCcw, Layers } from 'lucide-react';
import GanttChart from '../../components/gantt/GanttChart';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { normalizeGanttTasks } from '../../lib/ganttNormalize';
import ProjectDateBanner from '../../components/projects/ProjectDateBanner';

const PROJECT_STATUS_COLORS = {
  active: '#22c55e',
  planning: '#3b82f6',
  on_hold: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
};

const PROJECT_STATUS_LABELS = {
  active: 'Actif',
  planning: 'Planification',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

function parseGanttPayload(data) {
  if (data == null) return [];
  const raw =
    data.gantt ??
    data.data?.gantt ??
    (Array.isArray(data.data) ? data.data : null) ??
    data.tasks ??
    [];
  return Array.isArray(raw) ? raw : [];
}

/** Convert projects list + optional task data into gantt row format */
function buildProjectGanttRows(projects, ganttTasks) {
  // Compute per-project stats from task data
  const byProject = {};
  (ganttTasks || []).forEach((t) => {
    const pid = t.project_id;
    if (pid == null) return;
    if (!byProject[pid]) byProject[pid] = { starts: [], ends: [], progress: [] };
    if (t.start) byProject[pid].starts.push(t.start);
    if (t.end) byProject[pid].ends.push(t.end);
    const p = Number(t.progress ?? t.progress_percent ?? 0);
    if (Number.isFinite(p)) byProject[pid].progress.push(p);
  });

  return projects
    .filter((p) => {
      const hasDates = p.start_date || p.end_date;
      const hasTasks = Boolean(byProject[p.id]?.starts.length);
      return hasDates || hasTasks;
    })
    .map((p) => {
      const stats = byProject[p.id];
      const startDate =
        p.start_date ??
        (stats?.starts.length ? stats.starts.slice().sort()[0] : null);
      const endDate =
        p.end_date ??
        (stats?.ends.length ? stats.ends.slice().sort().reverse()[0] : null);
      const avgProgress =
        stats?.progress.length
          ? Math.round(stats.progress.reduce((s, v) => s + v, 0) / stats.progress.length)
          : 0;
      const isDelayed =
        endDate && new Date(endDate) < new Date() && p.status !== 'completed' && p.status !== 'cancelled';

      return {
        id: p.id,
        name: p.name,
        start: startDate ? String(startDate).slice(0, 10) : null,
        end: endDate ? String(endDate).slice(0, 10) : null,
        progress: avgProgress,
        progress_percent: avgProgress,
        priority: 'medium',
        is_critical: false,
        is_delayed: Boolean(isDelayed),
        status_color: PROJECT_STATUS_COLORS[p.status] || '#64748b',
        status_label: PROJECT_STATUS_LABELS[p.status] || p.status,
        dependencies: [],
        _type: 'project',
        task_count: stats ? stats.starts.length : 0,
        code: p.code,
      };
    });
}

function GanttContent({ viewMode, selectedProject, isLoading, ganttError, ganttErrorDetail, isEmpty, emptyDescription, displayRows }) {
  if (viewMode === 'project' && !selectedProject) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Sélectionnez un projet pour afficher ses tâches dans le Gantt</p>
        </CardContent>
      </Card>
    );
  }
  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (ganttError) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-10 text-center text-sm">
          <p className="font-medium text-destructive">Impossible de charger le Gantt</p>
          <p className="mt-2 text-muted-foreground">
            {ganttErrorDetail?.response?.data?.message || ganttErrorDetail?.message || 'Erreur réseau ou serveur.'}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={BarChart3}
            title={viewMode === 'global' ? 'Aucun projet à afficher' : 'Aucune tâche à afficher'}
            description={emptyDescription}
            className="border-0 bg-transparent py-10"
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <ErrorBoundary>
      <GanttChart
        tasks={displayRows}
        showProject={false}
        rowLabel={viewMode === 'global' ? 'Projet' : 'Tâche'}
      />
    </ErrorBoundary>
  );
}

export default function GanttPage() {
  const [viewMode, setViewMode] = useState('global');
  const [selectedProject, setSelectedProject] = useState('');
  const isGlobal = viewMode === 'global';

  const { data: projectsPayload } = useQuery({
    queryKey: ['projects-for-gantt'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data),
  });

  const projects = useMemo(() => {
    const d = projectsPayload?.data;
    return Array.isArray(d) ? d : [];
  }, [projectsPayload]);

  // Global tasks — used to enrich project gantt rows with derived dates/progress
  const { data: ganttGlobalRaw, isLoading: loadingGlobal, isError: errGlobal, error: errGlobalDetail } = useQuery({
    queryKey: ['gantt', 'global'],
    queryFn: () => api.get('/gantt').then((r) => parseGanttPayload(r.data)),
    enabled: isGlobal,
  });

  const { data: ganttProject, isLoading: loadingProject, isError: errProject, error: errProjectDetail } = useQuery({
    queryKey: ['gantt', 'project', selectedProject],
    queryFn: () => api.get(`/projects/${selectedProject}/gantt`).then((r) => parseGanttPayload(r.data)),
    enabled: !isGlobal && !!selectedProject,
  });

  // Global view: build project-level rows
  const projectGanttRows = useMemo(
    () => buildProjectGanttRows(projects, ganttGlobalRaw ?? []),
    [projects, ganttGlobalRaw],
  );

  // Project view: show individual tasks
  const ganttTasksNormalized = useMemo(
    () => normalizeGanttTasks(ganttProject ?? []),
    [ganttProject],
  );

  const ganttError = isGlobal ? errGlobal : errProject;
  const ganttErrorDetail = isGlobal ? errGlobalDetail : errProjectDetail;
  const isLoading = isGlobal ? loadingGlobal : loadingProject;
  const displayRows = isGlobal ? projectGanttRows : ganttTasksNormalized;
  const isEmpty = !displayRows || displayRows.length === 0;

  const emptyDescription = !isGlobal && selectedProject
    ? 'Aucune tâche planifiée pour ce projet'
    : 'Aucun projet avec des dates planifiées';

  // Projet sélectionné (pour afficher le bandeau de dates)
  const selectedProjectObj = !isGlobal && selectedProject
    ? projects.find((p) => String(p.id) === String(selectedProject))
    : null;

  const resetGanttFilters = () => {
    setViewMode('global');
    setSelectedProject('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-sm ring-1 ring-black/[0.03] dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 dark:ring-white/[0.06]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner dark:bg-primary/25">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Diagramme de Gantt</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Vue globale par <span className="font-medium text-foreground">projet</span> ou détaillée par tâches — chemin critique, avancement et repère{' '}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">aujourd'hui</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                <Layers className="h-3 w-3 text-primary" />
                Vue globale = projets
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Vue par projet = tâches + dépendances
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1 gap-1">
            <Button
              type="button"
              variant={viewMode === 'global' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => { setViewMode('global'); setSelectedProject(''); }}
            >
              <Layers className="h-3.5 w-3.5" />
              Vue globale (projets)
            </Button>
            <Button
              type="button"
              variant={viewMode === 'project' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode('project')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Vue par projet (tâches)
            </Button>
          </div>
          {viewMode === 'project' && (
            <div className="max-w-xs">
              <label className="mb-1 block text-xs text-muted-foreground">Projet</label>
              <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Sélectionner un projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetGanttFilters}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Réinitialiser
        </Button>
      </div>

      {/* Bandeau dates du projet sélectionné — vue par projet uniquement */}
      {selectedProjectObj && (
        <ProjectDateBanner project={selectedProjectObj} />
      )}

      {/* Summary bar for global project view */}
      {viewMode === 'global' && !isLoading && projectGanttRows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {['active', 'planning', 'on_hold', 'completed'].map((st) => {
            const count = projects.filter((p) => p.status === st).length;
            if (!count) return null;
            return (
              <span
                key={st}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PROJECT_STATUS_COLORS[st] }}
                />
                {PROJECT_STATUS_LABELS[st]} ({count})
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            {projectGanttRows.length} projet(s) avec dates
          </span>
        </div>
      )}

      {/* Main gantt content area */}
      <GanttContent
        viewMode={viewMode}
        selectedProject={selectedProject}
        isLoading={isLoading}
        ganttError={ganttError}
        ganttErrorDetail={ganttErrorDetail}
        isEmpty={isEmpty}
        emptyDescription={emptyDescription}
        displayRows={displayRows}
      />
    </div>
  );
}
