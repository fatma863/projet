<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProgressUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int    $taskId;
    public int    $projectId;
    public int    $taskProgress;
    public int    $projectProgress;
    public string $taskTitle;
    public int    $actorId;
    public string $actorName;
    public string $source; // 'worklog' | 'auto' | 'manager'

    public function __construct(
        Task   $task,
        int    $projectProgress,
        User   $actor,
        string $source = 'worklog'
    ) {
        $this->taskId          = $task->id;
        $this->projectId       = $task->project_id;
        $this->taskProgress    = $task->progress_percent;
        $this->projectProgress = $projectProgress;
        $this->taskTitle       = $task->title;
        $this->actorId         = $actor->id;
        $this->actorName       = $actor->name;
        $this->source          = $source;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->projectId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'progress.updated';
    }
}
