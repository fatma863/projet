<?php

namespace App\Models;

use App\Support\AccessControl;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'team_id',
        'client_id',
        'project_manager_id',
        'chef_id',
        'name',
        'code',
        'description',
        'status',
        'priority',
        'start_date',
        'end_date',
        'owner_id',
        'created_by',
        'progress_percent',
        // Pause / Resume fields
        'paused_at',
        'paused_by',
        'pause_reason',
        'previous_status',
    ];

    protected function casts(): array
    {
        return [
            'start_date'       => 'date',
            'end_date'         => 'date',
            'progress_percent' => 'integer',
            'paused_at'        => 'datetime',
        ];
    }

    // ─── Pause helpers ──────────────────────────────────────────────────────

    public function isPaused(): bool
    {
        return $this->status === 'on_hold';
    }

    public function isModifiable(): bool
    {
        return ! $this->isPaused();
    }

    public function pausedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paused_by');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function chef(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chef_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot('project_role')
            ->withTimestamps();
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_followers')->withTimestamps();
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(TaskStatus::class)->orderBy('order');
    }

    /**
     * Map workflow buckets to a Kanban column (task_statuses.id) for this project.
     *
     * @param  string  $workflow  todo|in_progress|done|at_risk
     */
    public function resolveStatusIdForWorkflow(string $workflow): ?int
    {
        $ids = $this->statuses()->orderBy('order')->pluck('id')->all();
        $n = count($ids);
        if ($n === 0) {
            return null;
        }
        if ($n === 1) {
            return $ids[0];
        }
        if ($workflow === 'todo') {
            return $ids[0];
        }
        if ($workflow === 'done') {
            return $ids[$n - 1];
        }

        // in_progress + at_risk → middle column(s)
        return $ids[min(1, $n - 1)];
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function sprints(): HasMany
    {
        return $this->hasMany(Sprint::class);
    }

    public function rootTasks(): HasMany
    {
        return $this->hasMany(Task::class)->whereNull('parent_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class)->latest();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(ProjectInvitation::class);
    }

    /**
     * Projets visibles pour l’utilisateur (membre du projet ou propriétaire).
     */
    public function scopeAccessibleToUser(Builder $query, User $user): Builder
    {
        if (AccessControl::isAdmin($user)) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id)
                ->orWhereHas('users', fn ($q2) => $q2->where('users.id', $user->id));
        });
    }
}
