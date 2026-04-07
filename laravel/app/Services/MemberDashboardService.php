<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Agrégations métier pour le tableau de bord membre (tâches assignées).
 */
class MemberDashboardService
{
    public function __construct(
        private readonly TaskDependencyService $taskDependencies,
        private readonly MemberDashboardMetricsQuery $metricsQuery,
    ) {}

    /**
     * @param  iterable<int|string|null>  $userIds
     */
    public static function forgetCacheForUsers(iterable $userIds): void
    {
        foreach ($userIds as $id) {
            if ($id === null || $id === '') {
                continue;
            }
            Cache::forget('member_dashboard_'.(int) $id);
        }
    }

    /**
     * Relations limitées pour les listes dashboard (évite N+1).
     *
     * @return array<string, \Closure>
     */
    private function listEagerLoad(): array
    {
        return [
            'project' => fn ($q) => $q->select('id', 'name', 'code'),
            'status' => fn ($q) => $q->select('id', 'name', 'color', 'order', 'project_id'),
            'assignees' => fn ($q) => $q->select('users.id', 'users.name', 'users.email'),
            'dependencies' => fn ($q) => $q->select(
                'tasks.id',
                'tasks.progress_percent',
                'tasks.workflow_status',
                'tasks.planned_end',
                'tasks.due_date'
            ),
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<Task>
     */
    public function assignedTasksQuery(User $user)
    {
        return Task::query()
            ->select(Task::API_INDEX_COLUMNS)
            ->whereNull('archived_at')
            ->assignedToUserId($user->id)
            ->with([
                'project' => fn ($q) => $q->select('id', 'name', 'code'),
                'status' => fn ($q) => $q->select('id', 'name', 'color', 'order', 'project_id'),
                'assignees' => fn ($q) => $q->select('users.id', 'users.name', 'users.email'),
                'dependencies' => fn ($q) => $q->select(
                    'tasks.id',
                    'tasks.progress_percent',
                    'tasks.workflow_status',
                    'tasks.planned_end',
                    'tasks.due_date'
                ),
            ]);
    }

    public function isTaskDone(Task $task): bool
    {
        return (int) ($task->progress_percent ?? 0) >= 100
            || ($task->workflow_status ?? '') === 'done';
    }

    public function isTaskInProgress(Task $task): bool
    {
        if ($this->isTaskDone($task)) {
            return false;
        }

        return ($task->workflow_status ?? '') === 'in_progress'
            || (int) ($task->progress_percent ?? 0) > 0;
    }

    /**
     * Fin effective pour échéance / retard : planned_end puis due_date.
     */
    public function effectiveEndDate(Task $task): ?\Carbon\Carbon
    {
        if ($task->planned_end) {
            return $task->planned_end->copy()->endOfDay();
        }
        if ($task->due_date) {
            return $task->due_date->copy()->endOfDay();
        }

        return null;
    }

    public function isOverdue(Task $task): bool
    {
        if ($this->isTaskDone($task)) {
            return false;
        }
        $end = $this->effectiveEndDate($task);
        if (! $end) {
            return false;
        }

        return $end->isPast();
    }

    public function daysLeft(Task $task): ?int
    {
        if ($this->isTaskDone($task)) {
            return null;
        }
        $end = $this->effectiveEndDate($task);
        if (! $end) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays($end->copy()->startOfDay(), false);
    }

    /**
     * Échéance dans ≤ 2 jours (ou dépassée) et progression &lt; 50 %.
     */
    public function isAtRiskBySchedule(Task $task): bool
    {
        if ($this->isTaskDone($task)) {
            return false;
        }
        $days = $this->daysLeft($task);
        if ($days === null) {
            return false;
        }
        $progress = (int) ($task->progress_percent ?? 0);

        return $days <= 2 && $progress < 50;
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(User $user): array
    {
        $summary = $this->metricsQuery->aggregateForUser($user->id);
        $blockedIdSet = $this->metricsQuery->blockedTaskIdSetForUser($user->id);
        $eager = $this->listEagerLoad();

        $base = fn () => Task::query()
            ->select(Task::API_INDEX_COLUMNS)
            ->whereNull('archived_at')
            ->assignedToUserId($user->id);

        $overdue = $base()
            ->whereDashboardOverdue()
            ->orderByDesc('updated_at')
            ->limit(25)
            ->with($eager)
            ->get();

        $upcoming = $base()
            ->whereUpcomingDeadline()
            ->orderByRaw('COALESCE(tasks.planned_end, tasks.due_date) ASC')
            ->limit(5)
            ->with($eager)
            ->get();

        $recent = $base()
            ->orderByDesc('updated_at')
            ->limit(15)
            ->with($eager)
            ->get();

        $blockedIds = array_keys($blockedIdSet);
        $blockedTasks = $blockedIds === []
            ? collect()
            : Task::query()
                ->select(Task::API_INDEX_COLUMNS)
                ->whereIn('id', $blockedIds)
                ->whereNull('archived_at')
                ->with($eager)
                ->orderByDesc('updated_at')
                ->get();

        $atRiskTasks = $base()
            ->whereAtRiskDashboard()
            ->orderByDesc('updated_at')
            ->limit(50)
            ->with($eager)
            ->get();

        $criticalTasks = $base()
            ->whereCriticalDashboard()
            ->orderByDesc('updated_at')
            ->limit(50)
            ->with($eager)
            ->get();

        $openTasks = max(0, $summary['total_assigned'] - $summary['completed']);
        $cap = max(1, NotificationService::OVERLOAD_ACTIVE_TASK_THRESHOLD);
        $workloadPercent = (int) min(100, round($openTasks / $cap * 100));

        return [
            'summary' => [
                'total_assigned' => $summary['total_assigned'],
                'completed' => $summary['completed'],
                'in_progress' => $summary['in_progress'],
                'todo' => $summary['todo'],
                'overdue_count' => $summary['overdue_count'],
                'open_estimated_hours' => $summary['open_estimated_hours'],
                'blocked_count' => $summary['blocked_count'],
                'at_risk_count' => $summary['at_risk_count'],
                'critical_count' => $summary['critical_count'],
                'workload_percent' => $workloadPercent,
                'workload_open_tasks' => $openTasks,
            ],
            'overdue_tasks' => $overdue->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
            'upcoming_deadlines' => $upcoming->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
            'recent_tasks' => $recent->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
            'blocked_tasks' => $blockedTasks->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
            'at_risk_tasks' => $atRiskTasks->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
            'critical_tasks' => $criticalTasks->map(fn (Task $t) => $this->taskBrief($t, $blockedIdSet))->values(),
        ];
    }

    /**
     * @param  array<int, true>  $blockedIdSet
     * @return array<string, mixed>
     */
    private function taskBrief(Task $task, array $blockedIdSet): array
    {
        $end = $this->effectiveEndDate($task);
        $daysLeft = $this->daysLeft($task);
        $progress = (int) ($task->progress_percent ?? 0);
        $isBlocked = isset($blockedIdSet[$task->id]);
        $isDepAtRisk = $this->taskDependencies->hasOverdueOpenPredecessor($task);
        $isAtRisk = ! $this->isTaskDone($task) && ($this->isAtRiskBySchedule($task) || $isDepAtRisk);

        return [
            'id' => $task->id,
            'title' => $task->title,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name,
            'priority' => $task->priority,
            'workflow_status' => $task->workflow_status,
            'progress_percent' => $progress,
            'start_date' => $task->planned_start?->toDateString(),
            'end_date' => $task->planned_end?->toDateString(),
            'due_date' => $task->due_date?->toDateString(),
            'effective_end_date' => $end?->toDateString(),
            'estimated_hours' => $task->estimated_hours !== null ? (float) $task->estimated_hours : null,
            'is_done' => $this->isTaskDone($task),
            'is_overdue' => $this->isOverdue($task),
            'days_left' => $daysLeft,
            'is_at_risk' => $isAtRisk,
            'is_blocked' => $isBlocked,
            'is_dependency_at_risk' => $isDepAtRisk,
        ];
    }
}
