import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BarChart3, CalendarRange, Sparkles, RotateCcw } from 'lucide-react';
import GanttChart from '../../components/gantt/GanttChart';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { normalizeGanttTasks } from '../../lib/ganttNormalize';

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

export default function GanttPage() {
  const [viewMode, setViewMode] = useState('global');
  const [selectedProject, setSelectedProject] = useState('');

  const { data: projectsPayload } = useQuery({
    queryKey: ['projects-for-gantt'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data),
  });

  const projects = useMemo(() => {
    const d = projectsPayload?.data;
    return Array.isArray(d) ? d : [];
  }, [projectsPayload]);

  const { data: ganttGlobal, isLoading: loadingGlobal, isError: errGlobal, error: errGlobalDetail } = useQuery({
    queryKey: ['gantt', 'global'],
    queryFn: () => api.get('/gantt').then((r) => parseGanttPayload(r.data)),
    enabled: viewMode === 'global',
  });

  const { data: ganttProject, isLoading: loadingProject, isError: errProject, error: errProjectDetail } = useQuery({
    queryKey: ['gantt', 'project', selectedProject],
    queryFn: () => api.get(`/gantt?project_id=${selectedProject}`).then((r) => parseGanttPayload(r.data)),
    enabled: viewMode === 'project' && !!selectedProject,
  });

  const ganttRaw = viewMode === 'global' ? ganttGlobal : ganttProject;
  const ganttTasksNormalized = useMemo(() => normalizeGanttTasks(ganttRaw ?? []), [ganttRaw]);

  const ganttError = viewMode === 'global' ? errGlobal : errProject;
  const ganttErrorDetail = viewMode === 'global' ? errGlobalDetail : errProjectDetail;

  const isLoading = viewMode === 'global' ? loadingGlobal : loadingProject;

  useEffect(() => {
    try {
      console.log('Gantt tasks:', ganttRaw);
      console.log('Projects:', projects);
    } catch (e) {
      console.warn('Gantt debug log failed', e);
    }
  }, [ganttRaw, projects]);

  const resetGanttFilters = () => {
    setViewMode('global');
    setSelectedProject('');
  };

  const emptyDescription =
    viewMode === 'project' && selectedProject
      ? 'Aucune tâche planifiée pour ce projet'
      : 'Aucune tâche avec des dates planifiées (début requis)';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-sm ring-1 ring-black/[0.03] dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 dark:ring-white/[0.06]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner dark:bg-primary/25">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Diagramme de Gantt</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Vue timeline des jalons et dépendances : chemin critique, avancement et repère{' '}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">aujourd’hui</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Dépendances courbes & flèches
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                Grille hebdomadaire
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={viewMode === 'global' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('global');
                setSelectedProject('');
              }}
            >
              Vue globale
            </Button>
            <Button type="button" variant={viewMode === 'project' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('project')}>
              Vue par projet
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
          Réinitialiser les filtres
        </Button>
      </div>

      {viewMode === 'project' && !selectedProject ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Sélectionnez un projet pour afficher le diagramme de Gantt</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : ganttError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm">
            <p className="font-medium text-destructive">Impossible de charger le Gantt</p>
            <p className="mt-2 text-muted-foreground">
              {ganttErrorDetail?.response?.data?.message || ganttErrorDetail?.message || 'Erreur réseau ou serveur.'}
            </p>
          </CardContent>
        </Card>
      ) : !ganttTasksNormalized || ganttTasksNormalized.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={BarChart3}
              title="Aucune tâche à afficher"
              description={emptyDescription}
              className="border-0 bg-transparent py-10"
            />
          </CardContent>
        </Card>
      ) : (
        <ErrorBoundary>
          <GanttChart tasks={ganttTasksNormalized} showProject={viewMode === 'global'} />
        </ErrorBoundary>
      )}
    </div>
  );
}
