<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Models\Task;
use App\Models\User;

class NotificationService
{
    public function notifyTaskAssigned(Task $task, User $assignee, ?User $actor = null): Notification
    {
        $notification = Notification::create([
            'user_id' => $assignee->id,
            'type' => 'task_assigned',
            'data' => [
                'title' => 'Nouvelle tâche assignée',
                'message' => 'Vous êtes assigné à la tâche "'.$task->title.'"',
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'assigned_by' => $actor?->id,
            ],
        ]);

        $this->broadcastCreated($notification);

        return $notification;
    }

    public function notifyTaskMentioned(Task $task, User $recipient, int $commentId, ?int $actorId = null): Notification
    {
        $notification = Notification::create([
            'user_id' => $recipient->id,
            'type' => 'mention',
            'data' => [
                'title' => 'Vous avez été mentionné',
                'message' => 'Mention dans la tâche "'.$task->title.'"',
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'comment_id' => $commentId,
                'mentioned_by' => $actorId,
            ],
        ]);

        $this->broadcastCreated($notification);

        return $notification;
    }

    public function notifyTaskDelayed(Task $task, ?User $actor = null): void
    {
        $assignees = $task->assignees()->get();
        foreach ($assignees as $assignee) {
            $duplicate = Notification::query()
                ->where('user_id', $assignee->id)
                ->where('type', 'task_delayed')
                ->whereNull('read_at')
                ->whereJsonContains('data->task_id', $task->id)
                ->exists();

            if ($duplicate) {
                continue;
            }

            $notification = Notification::create([
                'user_id' => $assignee->id,
                'type' => 'task_delayed',
                'data' => [
                    'title' => 'Tâche en retard',
                    'message' => 'La tâche "'.$task->title.'" présente un risque de retard.',
                    'task_id' => $task->id,
                    'project_id' => $task->project_id,
                    'triggered_by' => $actor?->id,
                ],
            ]);

            $this->broadcastCreated($notification);
        }
    }

    private function broadcastCreated(Notification $notification): void
    {
        $unread = Notification::where('user_id', $notification->user_id)->whereNull('read_at')->count();
        broadcast(new NotificationCreated($notification, $unread))->toOthers();
    }
}
