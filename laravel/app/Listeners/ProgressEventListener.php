<?php

namespace App\Listeners;

use App\Events\ProgressUpdated;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class ProgressEventListener implements ShouldQueue
{
    public string $queue = 'notifications';

    public function __construct(private NotificationService $notificationService) {}

    public function handle(ProgressUpdated $event): void
    {
        // Only notify on significant milestones: 25%, 50%, 75%, 100%
        $milestones = [25, 50, 75, 100];
        if (! in_array($event->taskProgress, $milestones)) {
            return;
        }

        $task  = \App\Models\Task::find($event->taskId);
        $actor = User::find($event->actorId);
        if (! $task) {
            return;
        }

        if ($event->taskProgress === 100) {
            $this->notificationService->notifyTaskCompleted($task, $actor);
        } else {
            $this->notificationService->notifyTaskUpdated($task, $actor, ['progress_percent' => $event->taskProgress]);
        }
    }
}
