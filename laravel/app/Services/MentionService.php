<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Support\Collection;

class MentionService
{
    public function __construct(
        private readonly NotificationService $notificationService
    ) {
    }

    public function notifyMentions(TaskComment $comment): void
    {
        $task = $comment->task()->with('project.members')->first();
        if (!$task) {
            return;
        }

        $tokens = $this->extractMentionTokens($comment->body);
        if ($tokens->isEmpty()) {
            return;
        }

        $mentionedUsers = $this->resolveUsersInProject($tokens, $task)
            ->where('id', '!=', $comment->user_id);

        foreach ($mentionedUsers as $user) {
            $this->notificationService->notifyTaskMentioned(
                task: $task,
                recipient: $user,
                commentId: $comment->id,
                actorId: $comment->user_id
            );
        }
    }

    private function extractMentionTokens(string $body): Collection
    {
        preg_match_all('/@([A-Za-z0-9._-]+)/', $body, $matches);

        return collect($matches[1] ?? [])->map(fn (string $token) => mb_strtolower($token))->unique()->values();
    }

    private function resolveUsersInProject(Collection $tokens, Task $task): Collection
    {
        if ($tokens->isEmpty()) {
            return collect();
        }

        return User::query()
            ->where(function ($q) use ($task) {
                $pid = $task->project_id;
                $q->whereHas('projects', fn ($qp) => $qp->where('projects.id', $pid))
                    ->orWhereHas('accessibleProjects', fn ($qp) => $qp->where('projects.id', $pid))
                    ->orWhereHas('ownedProjects', fn ($qp) => $qp->where('projects.id', $pid));
            })
            ->where(function ($q) use ($tokens) {
                foreach ($tokens as $token) {
                    $q->orWhereRaw('LOWER(name) = ?', [$token])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$token.'@%']);
                }
            })
            ->get();
    }
}
