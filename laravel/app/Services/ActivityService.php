<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\Task;
use App\Models\User;

class ActivityService
{
    /**
     * Événement générique (team, project, etc.) réutilisable hors tâches.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function recordEntityAction(
        User $actor,
        string $action,
        string $targetType,
        int $targetId,
        array $metadata = [],
        ?int $projectId = null
    ): void {
        $this->insert($actor, $action, $targetType, $targetId, $projectId, $metadata);
    }

    public function recordCreatedTask(User $actor, Task $task): void
    {
        $this->insert(
            $actor,
            'created_task',
            'task',
            (int) $task->id,
            (int) $task->project_id,
            ['task_title' => $task->title]
        );
    }

    public function recordUpdatedTask(User $actor, Task $task, array $metadata = []): void
    {
        $this->insert(
            $actor,
            'updated_task',
            'task',
            (int) $task->id,
            (int) $task->project_id,
            $metadata
        );
    }

    public function recordAssignedTask(User $actor, Task $task, int $assigneeUserId): void
    {
        $this->insert(
            $actor,
            'assigned_task',
            'task',
            (int) $task->id,
            (int) $task->project_id,
            [
                'task_title' => $task->title,
                'assignee_user_id' => $assigneeUserId,
            ]
        );
    }

    public function recordJoinedProject(User $actor, Project $project, ?ProjectInvitation $invitation = null): void
    {
        $this->insert(
            $actor,
            'joined_project',
            'project',
            (int) $project->id,
            (int) $project->id,
            [
                'project_name' => $project->name,
                'invitation_id' => $invitation?->id,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function insert(
        User $actor,
        string $action,
        string $targetType,
        int $targetId,
        ?int $projectId,
        array $metadata = []
    ): void {
        Activity::create([
            'user_id' => $actor->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'project_id' => $projectId,
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }
}
