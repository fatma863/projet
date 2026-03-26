<?php

namespace App\Events;

use App\Models\TaskComment;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCommentDeleted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $projectId,
        public int $taskId,
        public int $commentId
    ) {
    }

    public static function fromComment(TaskComment $comment): self
    {
        return new self($comment->task->project_id, $comment->task_id, $comment->id);
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.'.$this->projectId)];
    }

    public function broadcastAs(): string
    {
        return 'task.comment.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->taskId,
            'comment_id' => $this->commentId,
        ];
    }
}
