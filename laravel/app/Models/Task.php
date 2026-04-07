<?php

namespace App\Models;

use App\Models\Specialty;
use App\Support\AccessControl;
use App\Support\SqlDateExpressions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    public const WORKFLOW_STATUSES = ['todo', 'in_progress', 'done', 'at_risk'];

    /**
     * Colonnes chargées pour listes API (index / dashboard) — évite SELECT *.
     *
     * @var list<string>
     */
    public const API_INDEX_COLUMNS = [
        'id', 'project_id', 'sprint_id', 'parent_id', 'title', 'description',
        'issue_type', 'status_id', 'priority', 'complexity', 'story_points',
        'planned_start', 'planned_end', 'due_date',
        'estimated_hours', 'estimated_duration', 'duration_days',
        'risk_level', 'risk_score', 'actual_hours', 'progress_percent',
        'kanban_order', 'position', 'workflow_status', 'created_by', 'updated_at', 'created_at', 'archived_at',
    ];

    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'sprint_id',
        'parent_id',
        'title',
        'description',
        'issue_type',
        'status_id',
        'priority',
        'complexity',
        'story_points',
        'planned_start',
        'planned_end',
        'due_date',
        'estimated_hours',
        'estimated_duration',
        'duration_days',
        'risk_level',
        'risk_score',
        'actual_hours',
        'progress_percent',
        'kanban_order',
        'workflow_status',
        'created_by',
        'updated_by',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'planned_start' => 'date',
            'planned_end' => 'date',
            'due_date' => 'date',
            'estimated_hours' => 'decimal:2',
            'estimated_duration' => 'integer',
            'duration_days' => 'integer',
            'risk_score' => 'integer',
            'actual_hours' => 'decimal:2',
            'complexity' => 'integer',
            'story_points' => 'integer',
            'progress_percent' => 'integer',
            'kanban_order' => 'integer',
            'position' => 'integer',
            'archived_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(TaskStatus::class, 'status_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignments')
            ->withPivot('allocation_percent', 'assigned_at')
            ->withTimestamps();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class);
    }

    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'depends_on_task_id')
            ->withPivot('type')
            ->withTimestamps();
    }

    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'depends_on_task_id', 'task_id')
            ->withPivot('type')
            ->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'task_specialty')->withTimestamps();
    }

    /**
     * Heures par point de story lorsque estimated_hours est absent (aligne la charge sur les SP).
     */
    public const DEFAULT_HOURS_PER_STORY_POINT = 1.0;

    public function isCompleted(): bool
    {
        return (int) ($this->progress_percent ?? 0) >= 100
            || ($this->workflow_status ?? '') === 'done';
    }

    /**
     * Heures estimées effectives : estimated_hours explicite, sinon story_points × constante.
     */
    public function effectiveEstimatedHours(): float
    {
        $h = (float) ($this->estimated_hours ?? 0);
        if ($h > 0) {
            return $h;
        }
        $sp = (int) ($this->story_points ?? 0);
        if ($sp > 0) {
            return $sp * self::DEFAULT_HOURS_PER_STORY_POINT;
        }

        return 0.0;
    }

    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && ! $this->isCompleted();
    }

    public static function inferWorkflowStatus(self $task): string
    {
        if ($task->isCompleted()) {
            return 'done';
        }
        $p = (int) ($task->progress_percent ?? 0);
        if (($task->risk_level ?? '') === 'high' || $task->isOverdue()) {
            return 'at_risk';
        }
        if ($p > 0) {
            return 'in_progress';
        }

        return 'todo';
    }

    public function refreshWorkflowStatus(): void
    {
        $this->workflow_status = self::inferWorkflowStatus($this);
        $this->saveQuietly();
    }

    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if (AccessControl::isAdmin($user)) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('tasks.created_by', $user->id)
                ->orWhereHas('assignees', fn ($assignees) => $assignees->where('users.id', $user->id))
                ->orWhereHas('project.users', fn ($projectUsers) => $projectUsers->where('users.id', $user->id))
                ->orWhereHas('project.members', fn ($legacyMembers) => $legacyMembers->where('users.id', $user->id))
                ->orWhereHas('project', fn ($pr) => $pr->where('owner_id', $user->id));
        });
    }

    public function scopeAssignedToUserId(Builder $query, int $userId): Builder
    {
        return $query->whereExists(function ($sub) use ($userId) {
            $sub->selectRaw('1')
                ->from('task_assignments')
                ->whereColumn('task_assignments.task_id', 'tasks.id')
                ->where('task_assignments.user_id', $userId);
        });
    }

    public function scopeWhereOpenNotDone(Builder $query): Builder
    {
        return $query->where('tasks.progress_percent', '<', 100)
            ->where(function ($qq) {
                $qq->whereNull('tasks.workflow_status')
                    ->orWhere('tasks.workflow_status', '!=', 'done');
            });
    }

    public function scopeWhereDashboardOverdue(Builder $query): Builder
    {
        $expr = SqlDateExpressions::taskOverdueCondition('tasks');

        return $query->whereOpenNotDone()
            ->whereRaw('COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL')
            ->whereRaw("($expr)");
    }

    public function scopeWhereUpcomingDeadline(Builder $query): Builder
    {
        $expr = SqlDateExpressions::taskOverdueCondition('tasks');

        return $query->whereOpenNotDone()
            ->whereRaw('COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL')
            ->whereRaw("NOT ($expr)");
    }

    public function scopeWhereAtRiskDashboard(Builder $query): Builder
    {
        $daysLeft = SqlDateExpressions::taskDaysUntilDeadlineExpr('tasks');
        $predOverdue = SqlDateExpressions::predecessorOverdueCondition('pred');

        return $query->whereOpenNotDone()->where(function ($outer) use ($daysLeft, $predOverdue) {
            $outer->whereRaw("COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL AND tasks.progress_percent < 50 AND ({$daysLeft}) <= 2")
                ->orWhereExists(function ($sub) use ($predOverdue) {
                    $sub->selectRaw('1')
                        ->from('task_dependencies as td')
                        ->join('tasks as pred', function ($join) {
                            $join->on('pred.id', '=', 'td.depends_on_task_id')
                                ->whereNull('pred.deleted_at');
                        })
                        ->whereColumn('td.task_id', 'tasks.id')
                        ->whereNull('pred.archived_at')
                        ->whereRaw("(pred.progress_percent < 100 AND (pred.workflow_status IS NULL OR pred.workflow_status <> 'done'))")
                        ->whereRaw("($predOverdue)");
                });
        });
    }

    public function scopeWhereCriticalDashboard(Builder $query): Builder
    {
        $expr = SqlDateExpressions::taskOverdueCondition('tasks');

        return $query->whereOpenNotDone()
            ->whereIn('tasks.priority', ['high', 'urgent'])
            ->where(function ($outer) use ($expr) {
                $outer->whereRaw("COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL AND ($expr)")
                    ->orWhereExists(function ($sub) {
                        $sub->selectRaw('1')
                            ->from('task_dependencies as td')
                            ->join('tasks as pred', function ($join) {
                                $join->on('pred.id', '=', 'td.depends_on_task_id')
                                    ->whereNull('pred.deleted_at');
                            })
                            ->whereColumn('td.task_id', 'tasks.id')
                            ->whereNull('pred.archived_at')
                            ->whereRaw("(pred.progress_percent < 100 AND (pred.workflow_status IS NULL OR pred.workflow_status <> 'done'))");
                    });
            });
    }
}
