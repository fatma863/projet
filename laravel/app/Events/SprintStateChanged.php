<?php

namespace App\Events;

use App\Models\Sprint;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SprintStateChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Sprint $sprint,
        public string $action, // started | completed
        public User $actor,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.' . $this->sprint->project_id)];
    }

    public function broadcastAs(): string
    {
        return 'sprint.state.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'sprint_id'  => $this->sprint->id,
            'project_id' => $this->sprint->project_id,
            'name'       => $this->sprint->name,
            'action'     => $this->action,
            'actor_id'   => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
