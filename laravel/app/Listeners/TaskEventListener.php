<?php

namespace App\Listeners;

use App\Events\TaskAssignmentChanged;
use App\Events\TaskDeleted;
use App\Events\TaskUpdated;
use App\Models\Task;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class TaskEventListener implements ShouldQueue
{
    public string $queue = 'notifications';

    public function __construct(private NotificationService $notificationService) {}

    public function handleTaskUpdated(TaskUpdated $event): void
    {
        $task   = $event->task;
        $actor  = $event->actor;
        $action = $event->action;

        // done → completed notification
        if ($action === 'updated' && $task->workflow_status === 'done') {
            $this->notificationService->notifyTaskCompleted($task, $actor);
            return;
        }

        if ($action === 'updated' && !empty($event->changed)) {
            $this->notificationService->notifyTaskUpdated($task, $actor, $event->changed);
        }

        if ($action === 'moved') {
            $this->notificationService->notifyTaskUpdated($task, $actor, ['workflow_status' => $task->workflow_status]);
        }
    }

    public function handleTaskAssignmentChanged(TaskAssignmentChanged $event): void
    {
        $task = $event->task;

        if ($event->action === 'assigned') {
            $assignee = \App\Models\User::find($event->affectedUserId);
            if ($assignee) {
                $this->notificationService->notifyTaskAssigned($task, $assignee, $event->actor);
                $this->notificationService->notifyOverloadIfNeeded($assignee);
            }
        }
    }
}
