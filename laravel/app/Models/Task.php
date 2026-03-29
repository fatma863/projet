<?php

namespace App\Models;

use App\Support\AccessControl;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    public const WORKFLOW_STATUSES = ['todo', 'in_progress', 'done', 'at_risk'];

    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'sprint_id',
        'parent_id',
        'title',
        'description',
        'status_id',
        'priority',
        'complexity',
        'story_points',
        'planned_start',
        'planned_end',
        'due_date',
        'estimated_hours',
        'estimated_duration',
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
            'risk_score' => 'integer',
            'actual_hours' => 'decimal:2',
            'complexity' => 'integer',
            'story_points' => 'integer',
            'progress_percent' => 'integer',
            'kanban_order' => 'integer',
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
        return $this->hasMany(TaskComment::class)->orderByDesc('created_at');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && $this->progress_percent < 100;
    }

    public static function inferWorkflowStatus(self $task): string
    {
        $p = (int) ($task->progress_percent ?? 0);
        if ($p >= 100) {
            return 'done';
        }
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
}
