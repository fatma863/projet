<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Task $task,
        public User $actor,
        public string $action = 'updated', // updated | moved
        public array $changed = [],
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.' . $this->task->project_id)];
    }

    public function broadcastAs(): string
    {
        return 'task.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id'    => $this->task->id,
            'project_id' => $this->task->project_id,
            'action'     => $this->action,
            'changed'    => $this->changed,
            'actor_id'   => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
