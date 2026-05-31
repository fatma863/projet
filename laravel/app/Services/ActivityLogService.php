<?php

namespace App\Services;

use App\Events\ActivityLogged;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class ActivityLogService
{
    /** Actions that warrant a "warning" severity. */
    private const WARNING_PATTERNS = [
        'task.assigned', 'task.unassigned', 'task.status_changed',
        'project.member_added', 'project.member_removed', 'project.member_role_changed',
        'project.user_invited',
        'project.paused', 'project.resumed',
        'sprint.started', 'sprint.completed',
    ];

    /** Actions that warrant a "critical" severity. */
    private const CRITICAL_PATTERNS = [
        'task.deleted',
        'project.deleted',
    ];

    public function log(
        Project $project,
        ?User   $actor,
        string  $action,
        Model   $entity,
        array   $meta       = [],
        array   $oldValues  = [],
        array   $newValues  = []
    ): ActivityLog {
        $changedFields = array_keys($newValues) ?: (array_keys($oldValues) ?: []);

        $activity = ActivityLog::create([
            'project_id'     => $project->id,
            'actor_id'       => $actor?->id,
            'entity_type'    => $entity::class,
            'entity_id'      => $entity->getKey(),
            'action'         => $action,
            'meta'           => $meta,
            'old_values'     => $oldValues ?: null,
            'new_values'     => $newValues ?: null,
            'changed_fields' => $changedFields ?: null,
            'ip_address'     => Request::ip(),
            'user_agent'     => substr((string) Request::userAgent(), 0, 500),
            'severity'       => $this->resolveSeverity($action),
            'source'         => Request::hasSession() ? 'web' : 'api',
            'actor_role'     => $actor?->getRoleNames()->first(),
        ]);

        broadcast(new ActivityLogged($activity))->toOthers();

        return $activity;
    }

    private function resolveSeverity(string $action): string
    {
        foreach (self::CRITICAL_PATTERNS as $pattern) {
            if (str_starts_with($action, $pattern)) {
                return 'critical';
            }
        }
        foreach (self::WARNING_PATTERNS as $pattern) {
            if (str_starts_with($action, $pattern)) {
                return 'warning';
            }
        }
        return 'info';
    }
}
