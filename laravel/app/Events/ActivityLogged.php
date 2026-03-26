<?php

namespace App\Events;

use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ActivityLogged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public ActivityLog $activityLog)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.'.$this->activityLog->project_id)];
    }

    public function broadcastAs(): string
    {
        return 'activity.logged';
    }

    public function broadcastWith(): array
    {
        return [
            'activity' => (new ActivityLogResource($this->activityLog->load('actor')))->resolve(),
        ];
    }
}
