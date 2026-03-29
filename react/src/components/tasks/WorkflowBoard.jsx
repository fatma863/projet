import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';

const COLUMNS = [
  { id: 'todo', label: 'À faire', accent: 'border-slate-200 bg-slate-50/80' },
  { id: 'in_progress', label: 'En cours', accent: 'border-amber-200 bg-amber-50/80' },
  { id: 'done', label: 'Terminé', accent: 'border-emerald-200 bg-emerald-50/80' },
  { id: 'at_risk', label: 'À risque', accent: 'border-red-200 bg-red-50/80' },
];

function normalizeTasks(tasks) {
  if (!tasks) return [];
  return Array.isArray(tasks) ? tasks : tasks.data || [];
}

export function WorkflowBoard({ tasks, loading, readOnly }) {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState(null);

  const list = useMemo(() => normalizeTasks(tasks), [tasks]);

  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], done: [], at_risk: [] };
    list.forEach((t) => {
      const k = t.workflow_status && g[t.workflow_status] !== undefined ? t.workflow_status : 'todo';
      g[k].push(t);
    });
    return g;
  }, [list]);

  const updateWorkflow = useMutation({
    mutationFn: ({ id, workflow_status }) => api.put(`/tasks/${id}`, { workflow_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-global'] });
    },
  });

  const onDragStart = useCallback((e, task) => {
    if (readOnly) return;
    setDraggingId(task.id);
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  }, [readOnly]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e, columnId) => {
      e.preventDefault();
      const id = Number(e.dataTransfer.getData('text/plain') || draggingId);
      setDraggingId(null);
      if (!id || readOnly) return;
      const task = list.find((t) => t.id === id);
      if (!task || task.workflow_status === columnId) return;
      if (task.access?.can_edit === false) return;
      updateWorkflow.mutate({ id, workflow_status: columnId });
    },
    [draggingId, list, readOnly, updateWorkflow]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, col.id)}
          className={cn(
            'flex min-h-[280px] flex-col rounded-xl border-2 border-dashed p-3 transition-colors',
            col.accent,
            updateWorkflow.isPending && 'opacity-80'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
            <span className="text-xs text-muted-foreground">{grouped[col.id]?.length ?? 0}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {(grouped[col.id] || []).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                draggable={!readOnly}
                onDragStart={onDragStart}
                compact
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
