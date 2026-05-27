<?php

namespace App\Events;

use App\Models\Project;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast whenever a project is paused or resumed.
 * All members on the private project channel receive an instant update.
 */
class ProjectStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    /**
     * @param  Project  $project  The project whose status changed
     * @param  User     $actor    Who triggered the action
     * @param  string   $action   'paused' | 'resumed'
     * @param  string   $previousStatus  The status before the change
     */
    public function __construct(
        public readonly Project $project,
        public readonly User    $actor,
        public readonly string  $action,
        public readonly string  $previousStatus,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->project->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'project.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'project_id'      => $this->project->id,
            'project_name'    => $this->project->name,
            'action'          => $this->action,           // 'paused' | 'resumed'
            'new_status'      => $this->project->status,
            'previous_status' => $this->previousStatus,
            'pause_reason'    => $this->project->pause_reason,
            'paused_at'       => $this->project->paused_at?->toISOString(),
            'actor_id'        => $this->actor->id,
            'actor_name'      => $this->actor->name,
            'actor_avatar'    => $this->actor->avatar_url ?? null,
        ];
    }
}
