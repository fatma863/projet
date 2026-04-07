import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { Calendar, Flag, GripVertical } from 'lucide-react';

const PRIORITY_VARIANT = {
  low: 'secondary',
  medium: 'outline',
  high: 'warning',
  urgent: 'destructive',
};

const WORKFLOW_LABEL = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  at_risk: 'À risque',
};

const PRIORITY_LABEL = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

export function TaskCard({
  task,
  draggable = false,
  onDragStart,
  className,
  compact = false,
}) {
  const wf = task.workflow_status || 'todo';
  const canDrag = draggable && task.access?.can_edit !== false;

  return (
    <Card
      draggable={canDrag}
      onDragStart={canDrag ? (e) => onDragStart?.(e, task) : undefined}
      className={cn(
        'transition-shadow hover:shadow-md',
        canDrag && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      <CardContent className={cn('p-3', compact && 'p-2')}>
        <div className="flex gap-2">
          {canDrag && (
            <div className="text-muted-foreground pt-0.5">
              <GripVertical size={16} />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link
                to={`/projects/${task.project_id}`}
                className="font-medium text-foreground hover:text-primary line-clamp-2"
              >
                {task.title}
              </Link>
              <Badge variant={PRIORITY_VARIANT[task.priority] || 'outline'} className="shrink-0 text-[10px] uppercase">
                {PRIORITY_LABEL[task.priority] || task.priority || '—'}
              </Badge>
            </div>
            {task.project && (
              <p className="text-xs text-muted-foreground truncate">
                {task.project.name}
                {task.project.code ? ` · ${task.project.code}` : ''}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-normal">
                {WORKFLOW_LABEL[wf] || wf}
              </Badge>
              {(task.progress_percent || 0) >= 100 && (
                <Badge className="border-emerald-200 bg-emerald-50 font-normal text-emerald-900">Terminé</Badge>
              )}
              {task.is_overdue && (task.progress_percent || 0) < 100 && (
                <Badge variant="destructive" className="font-normal">En retard</Badge>
              )}
              {wf === 'at_risk' && (task.progress_percent || 0) < 100 && !task.is_overdue && (
                <Badge className="border-amber-200 bg-amber-100 font-normal text-amber-900">À risque</Badge>
              )}
              {task.is_blocked && (
                <Badge variant="secondary" className="font-normal">Bloqué</Badge>
              )}
              {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  Dépend de {task.dependencies.length} tâche{task.dependencies.length > 1 ? 's' : ''}
                </Badge>
              )}
              {task.due_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(task.due_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {typeof task.progress_percent === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Flag size={12} />
                  {task.progress_percent}%
                </span>
              )}
            </div>
            {task.assignees?.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {task.assignees.map((a) => a.name || a.user?.name).filter(Boolean).join(', ') || '—'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
