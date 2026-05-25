<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskDeleted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $taskId,
        public int $projectId,
        public string $taskTitle,
        public User $actor,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.' . $this->projectId)];
    }

    public function broadcastAs(): string
    {
        return 'task.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id'    => $this->taskId,
            'project_id' => $this->projectId,
            'task_title' => $this->taskTitle,
            'actor_id'   => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
