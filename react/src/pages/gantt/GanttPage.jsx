import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BarChart3 } from 'lucide-react';

const PRIORITY_COLORS = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

export default function GanttPage() {
  const [mode, setMode] = useState('global');
  const [selectedProject, setSelectedProject] = useState('');
  const [globalProjectFilter, setGlobalProjectFilter] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-for-gantt'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: ganttGlobal, isLoading: loadingGlobal } = useQuery({
    queryKey: ['gantt-global', globalProjectFilter],
    queryFn: () => {
      const q = globalProjectFilter ? `?project_id=${globalProjectFilter}` : '';
      return api.get(`/gantt${q}`).then((r) => r.data.gantt);
    },
    enabled: mode === 'global',
  });

  const { data: ganttProject, isLoading: loadingProject } = useQuery({
    queryKey: ['gantt', selectedProject],
    queryFn: () => api.get(`/projects/${selectedProject}/gantt`).then((r) => r.data.gantt),
    enabled: mode === 'project' && !!selectedProject,
  });

  const ganttData = mode === 'global' ? ganttGlobal : ganttProject;
  const isLoading = mode === 'global' ? loadingGlobal : loadingProject;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diagramme de Gantt</h1>
        <p className="text-muted-foreground">Chronologie des tâches (vue globale ou par projet)</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'global' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('global')}
          >
            Vue globale
          </Button>
          <Button
            type="button"
            variant={mode === 'project' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('project')}
          >
            Un projet
          </Button>
        </div>
        {mode === 'global' && (
          <div className="max-w-xs">
            <label className="mb-1 block text-xs text-muted-foreground">Filtrer par projet (optionnel)</label>
            <Select value={globalProjectFilter} onChange={(e) => setGlobalProjectFilter(e.target.value)}>
              <option value="">Tous les projets</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </Select>
          </div>
        )}
        {mode === 'project' && (
          <div className="max-w-xs">
            <label className="mb-1 block text-xs text-muted-foreground">Projet</label>
            <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Sélectionner un projet</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {mode === 'project' && !selectedProject ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Sélectionnez un projet pour afficher le diagramme de Gantt</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !ganttData || ganttData.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucune tâche avec des dates planifiées (début requis)
          </CardContent>
        </Card>
      ) : (
        <GanttChart tasks={ganttData} showProject={mode === 'global'} />
      )}
    </div>
  );
}

function GanttChart({ tasks }) {
  const { minDate, maxDate, totalDays, months } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    tasks.forEach((t) => {
      if (t.start) min = Math.min(min, new Date(t.start).getTime());
      if (t.end) max = Math.max(max, new Date(t.end).getTime());
    });
    // Add padding
    const pad = 2 * 86400000;
    min -= pad;
    max += pad;
    const totalDays = Math.ceil((max - min) / 86400000);
    const minD = new Date(min);
    const maxD = new Date(max);

    // Build month markers
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

    return { minDate: min, maxDate: max, totalDays, months };
  }, [tasks]);

  const taskRows = useMemo(() => tasks.map((task, index) => ({ ...task, rowIndex: index })), [tasks]);
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

  const dependencies = useMemo(() => {
    const lines = [];
    taskRows.forEach((task) => {
      const to = getBarMetrics(task);
      if (!to || !task.dependencies?.length) return;
      task.dependencies.forEach((dep) => {
        const fromTask = byId.get(dep.id);
        const from = fromTask ? getBarMetrics(fromTask) : null;
        if (!from || !fromTask) return;
        lines.push({
          key: `${dep.id}-${task.id}-${dep.type}`,
          x1: from.left + from.width,
          y1: fromTask.rowIndex * 36 + 18,
          x2: to.left,
          y2: task.rowIndex * 36 + 18,
          critical: task.is_critical && fromTask.is_critical,
        });
      });
    });
    return lines;
  }, [taskRows, byId, minDate, totalDays]);

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

      {/* Rows */}
      <div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-64 right-0 top-0 z-10" style={{ height: `${chartHeight}px` }}>
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

          {taskRows.map((task) => {
          const metrics = getBarMetrics(task);
          return (
            <div key={task.id} className="flex border-b border-border last:border-0">
              {/* Task name */}
              <div className="flex w-64 flex-shrink-0 flex-col justify-center gap-0.5 border-r border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: task.status_color || '#6b7280' }}
                  />
                  <span className="truncate text-sm text-foreground" title={task.name}>
                    {task.name}
                  </span>
                </div>
                {showProject && task.project_name && (
                  <span className="truncate pl-4 text-[11px] text-muted-foreground">{task.project_name}</span>
                )}
              </div>

              {/* Bar area */}
              <div className="relative flex-1 py-2" style={{ minHeight: '36px' }}>
                {metrics ? (
                  <div
                    className={`absolute top-2 z-20 h-6 rounded ${task.is_critical ? 'ring-2 ring-red-600 ring-offset-1' : ''} ${task.is_delayed ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}
                    style={{
                      left: `${metrics.left}%`,
                      width: `${metrics.width}%`,
                      backgroundColor: task.is_critical ? '#dc2626' : task.is_delayed ? '#ea580c' : (PRIORITY_COLORS[task.priority] || '#6366f1'),
                      opacity: 0.85,
                    }}
                    title={task.is_critical ? 'Chemin critique' : task.is_delayed ? 'Retard / échéance' : undefined}
                  >
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <div
                        className="h-full rounded bg-black/20"
                        style={{ width: `${task.progress}%` }}
                      />
                    )}
                    {/* Label */}
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-3 py-2">
        {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
            {key === 'low' ? 'Basse' : key === 'medium' ? 'Moyenne' : key === 'high' ? 'Haute' : 'Urgente'}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded bg-red-600" />
          Chemin critique
        </div>
      </div>
    </div>
  );
}
