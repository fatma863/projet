<?php

namespace App\Services;

use App\Events\ActivityLogged;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ActivityLogService
{
    public function log(Project $project, ?User $actor, string $action, Model $entity, array $meta = []): ActivityLog
    {
        $activity = ActivityLog::create([
            'project_id' => $project->id,
            'actor_id' => $actor?->id,
            'entity_type' => $entity::class,
            'entity_id' => $entity->getKey(),
            'action' => $action,
            'meta' => $meta,
        ]);

        broadcast(new ActivityLogged($activity))->toOthers();

        return $activity;
    }
}
