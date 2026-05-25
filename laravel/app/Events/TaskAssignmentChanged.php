<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskAssignmentChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Task $task,
        public int $affectedUserId,
        public string $action, // assigned | unassigned
        public User $actor,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->task->project_id),
            new PrivateChannel('user.' . $this->affectedUserId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task.assignment.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id'          => $this->task->id,
            'task_title'       => $this->task->title,
            'project_id'       => $this->task->project_id,
            'affected_user_id' => $this->affectedUserId,
            'action'           => $this->action,
            'actor_id'         => $this->actor->id,
            'actor_name'       => $this->actor->name,
        ];
    }
}
