<?php

namespace App\Events;

use App\Http\Resources\CommentResource;
use App\Models\TaskComment;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public TaskComment $comment)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.'.$this->comment->task->project_id)];
    }

    public function broadcastAs(): string
    {
        return 'task.comment.created';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->comment->task_id,
            'comment' => (new CommentResource($this->comment->load('user')))->resolve(),
        ];
    }
}
