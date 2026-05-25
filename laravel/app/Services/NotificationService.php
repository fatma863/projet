<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Mail\TaskNotificationMail;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public const OVERLOAD_ACTIVE_TASK_THRESHOLD = 12;
    public const PROJECT_AT_RISK_MIN_DELAYED     = 4;

    // ──────────────────────────────────────────────────────────────────────────
    // Task notifications
    // ──────────────────────────────────────────────────────────────────────────

    public function notifyTaskAssigned(Task $task, User $assignee, ?User $actor = null): ?Notification
    {
        // Auto-watch the task when assigned
        $task->watchers()->syncWithoutDetaching([$assignee->id]);

        return $this->createNotification(
            $assignee,
            'task_assigned',
            "Tâche assignée : « {$task->title} »",
            'info',
            $this->taskPayload($task, $actor, ['title' => 'Nouvelle assignation']),
            $task->project_id,
            $actor,
        );
    }

    /**
     * Notify assignees, creator, chef, and watchers when a task is updated.
     */
    public function notifyTaskUpdated(Task $task, ?User $actor = null, array $changed = []): void
    {
        $message = "La tâche « {$task->title} » a été modifiée";
        $data = $this->taskPayload($task, $actor, [
            'title'   => 'Tâche modifiée',
            'changed' => $changed,
        ]);

        foreach ($this->taskNotificationRecipients($task, $actor) as $recipient) {
            $this->createNotification($recipient, 'task_updated', $message, 'info', $data, $task->project_id, $actor);
        }
    }

    public function notifyTaskCompleted(Task $task, ?User $actor = null): void
    {
        $message = "Tâche terminée : « {$task->title} »";
        $data = $this->taskPayload($task, $actor, ['title' => 'Tâche terminée']);

        foreach ($this->taskNotificationRecipients($task, $actor) as $recipient) {
            $this->createNotification($recipient, 'task_completed', $message, 'info', $data, $task->project_id, $actor);
        }
    }

    public function notifyTaskDelayed(Task $task, ?User $actor = null): void
    {
        if (! $this->taskIsDelayed($task)) {
            return;
        }

        $message = "La tâche « {$task->title} » est en retard";
        $data = $this->taskPayload($task, $actor, ['title' => 'Tâche en retard']);

        foreach ($this->taskNotificationRecipients($task, null) as $recipient) {
            if ($this->hasUnreadOfTypeForTask($recipient->id, 'task_delayed', $task->id)) {
                continue;
            }
            $this->createNotification($recipient, 'task_delayed', $message, 'warning', $data, $task->project_id, $actor);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Comment / mention notifications
    // ──────────────────────────────────────────────────────────────────────────

    public function notifyTaskCommentAdded(Task $task, User $recipient, int $commentId, ?User $actor = null): Notification
    {
        $message = "Nouveau commentaire sur « {$task->title} »";

        return $this->createNotification(
            $recipient,
            'task_comment',
            $message,
            'info',
            array_merge($this->taskPayload($task, $actor, ['title' => 'Commentaire']), ['comment_id' => $commentId]),
            $task->project_id,
            $actor,
        );
    }

    /**
     * Notify all relevant parties about a new comment (watchers, assignees, previous commenters).
     */
    public function notifyCommentCreated(TaskComment $comment, ?User $actor = null): void
    {
        $task = $comment->task;
        if (! $task) {
            return;
        }

        $message = "Nouveau commentaire sur « {$task->title} »";
        $data    = array_merge(
            $this->taskPayload($task, $actor, ['title' => 'Commentaire']),
            ['comment_id' => $comment->id]
        );

        $recipients = $this->taskNotificationRecipients($task, $actor);

        // Also include previous commenters
        $commenterIds = $task->comments()
            ->where('user_id', '!=', $actor?->id)
            ->distinct()
            ->pluck('user_id');
        $commenters = User::whereIn('id', $commenterIds)->get();
        $recipients = $recipients->merge($commenters)->unique('id');

        foreach ($recipients as $recipient) {
            $this->createNotification($recipient, 'task_comment', $message, 'info', $data, $task->project_id, $actor);
        }
    }

    public function notifyTaskMentioned(Task $task, User $recipient, int $commentId, ?int $actorId = null): ?Notification
    {
        $actor = $actorId ? User::find($actorId) : null;
        $message = "Vous avez été mentionné dans « {$task->title} »";

        return $this->createNotification(
            $recipient,
            'task_mentioned',
            $message,
            'info',
            array_merge($this->taskPayload($task, $actor, ['title' => 'Mention']), ['comment_id' => $commentId]),
            $task->project_id,
            $actor,
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Project notifications
    // ──────────────────────────────────────────────────────────────────────────

    public function notifyProjectCreated(Project $project, ?User $actor = null): void
    {
        $message = "Nouveau projet créé : « {$project->name} »";
        $data    = $this->projectPayload($project, $actor, ['title' => 'Projet créé']);

        foreach ($project->members as $member) {
            if ($actor && $member->id === $actor->id) {
                continue;
            }
            $this->createNotification($member, 'project_created', $message, 'info', $data, $project->id, $actor);
        }
    }

    public function notifyProjectUpdated(Project $project, ?User $actor = null, array $changed = []): void
    {
        $message = "Le projet « {$project->name} » a été mis à jour";
        $data    = array_merge(
            $this->projectPayload($project, $actor, ['title' => 'Projet modifié']),
            ['changed' => $changed]
        );

        foreach ($this->projectNotificationRecipients($project, $actor) as $recipient) {
            $this->createNotification($recipient, 'project_updated', $message, 'info', $data, $project->id, $actor);
        }
    }

    public function notifyProjectAtRiskIfNeeded(Project $project): void
    {
        $delayed = $this->countDelayedTasksInProject($project);
        if ($delayed < self::PROJECT_AT_RISK_MIN_DELAYED) {
            return;
        }

        $message = "Le projet « {$project->name} » est à risque ({$delayed} tâches en retard)";
        $data    = array_merge(
            $this->projectPayload($project, null, ['title' => 'Projet à risque']),
            ['delayed_task_count' => $delayed]
        );

        foreach ($this->projectRiskRecipients($project) as $admin) {
            if ($this->hasProjectAtRiskNotificationToday($admin->id, $project->id)) {
                continue;
            }
            $this->createNotification($admin, 'project_at_risk', $message, 'alert', $data, $project->id);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Permission / invitation notifications
    // ──────────────────────────────────────────────────────────────────────────

    public function notifyPermissionUpdated(User $affectedUser, ?User $actor = null, array $details = []): ?Notification
    {
        $message = 'Vos permissions ont été mises à jour';

        return $this->createNotification(
            $affectedUser,
            'permission_updated',
            $message,
            'warning',
            array_merge(['title' => 'Permissions modifiées'], $details, [
                'actor_name'       => $actor?->name,
                'actor_avatar_url' => $this->userAvatarUrl($actor),
            ]),
            null,
            $actor,
        );
    }

    public function notifyProjectInvitationPending(User $invitee, Project $project, User $inviter, ProjectInvitation $invitation): ?Notification
    {
        $message = "Vous avez été invité au projet « {$project->name} »";

        return $this->createNotification(
            $invitee,
            'invitation_received',
            $message,
            'info',
            [
                'title'              => 'Invitation au projet',
                'message'            => $message,
                'project_id'         => $project->id,
                'project_name'       => $project->name,
                'invitation_id'      => $invitation->id,
                'token'              => $invitation->token,
                'inviter_name'       => $inviter->name,
                'inviter_avatar_url' => $this->userAvatarUrl($inviter),
            ],
            $project->id,
            $inviter,
        );
    }

    public function notifyPendingInvitationsAfterRegistration(User $user): void
    {
        $invitations = ProjectInvitation::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
            ->where('status', ProjectInvitation::STATUS_PENDING)
            ->with(['project', 'inviter'])
            ->get();

        foreach ($invitations as $invitation) {
            if ($invitation->isExpired()) {
                $invitation->forceFill(['status' => ProjectInvitation::STATUS_EXPIRED])->saveQuietly();
                continue;
            }
            if (! $invitation->project || ! $invitation->inviter) {
                continue;
            }
            $this->notifyProjectInvitationPending($user, $invitation->project, $invitation->inviter, $invitation);
        }
    }

    public function notifyProjectInvitationAccepted(User $inviter, Project $project, User $newMember): ?Notification
    {
        $message = "{$newMember->name} a rejoint le projet « {$project->name} »";

        return $this->createNotification(
            $inviter,
            'project_invitation_accepted',
            $message,
            'info',
            $this->projectPayload($project, $newMember, [
                'title'      => 'Invitation acceptée',
                'invitee_id' => $newMember->id,
            ]),
            $project->id,
            $newMember,
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // AI / smart notifications
    // ──────────────────────────────────────────────────────────────────────────

    public function notifyOverloadIfNeeded(User $user): void
    {
        $count = $this->countActiveTasksForUser($user);
        if ($count < self::OVERLOAD_ACTIVE_TASK_THRESHOLD || $this->hasOverloadNotificationToday($user->id)) {
            return;
        }

        $this->createNotification(
            $user,
            'workload_alert',
            "Surcharge détectée : {$count} tâches actives",
            'warning',
            ['title' => 'Surcharge', 'active_task_count' => $count, 'threshold' => self::OVERLOAD_ACTIVE_TASK_THRESHOLD],
        );
    }

    public function notifyAiAlert(User $user, string $message, string $severity = 'warning', array $data = []): ?Notification
    {
        return $this->createNotification(
            $user,
            'ai_alert',
            $message,
            $severity,
            array_merge(['title' => 'Alerte IA'], $data),
        );
    }

    public function notifyGanttUpdated(Task $task, ?User $actor = null): void
    {
        $message = "Planification modifiée pour « {$task->title} »";
        $data    = $this->taskPayload($task, $actor, ['title' => 'Gantt mis à jour']);

        foreach ($this->taskNotificationRecipients($task, $actor) as $recipient) {
            $this->createNotification($recipient, 'gantt_updated', $message, 'info', $data, $task->project_id, $actor);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Scheduled smart checks
    // ──────────────────────────────────────────────────────────────────────────

    public function runScheduledSmartChecks(): void
    {
        Task::query()
            ->whereNull('archived_at')
            ->where('workflow_status', '!=', 'done')
            ->where('progress_percent', '<', 100)
            ->chunkById(100, function ($tasks) {
                foreach ($tasks as $task) {
                    $this->notifyTaskDelayed($task, null);
                }
            });

        User::query()->chunkById(100, function ($users) {
            foreach ($users as $user) {
                $this->notifyOverloadIfNeeded($user);
            }
        });

        Project::query()->chunkById(50, function ($projects) {
            foreach ($projects as $project) {
                $this->notifyProjectAtRiskIfNeeded($project);
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Recipient resolution helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * For a task: assignees + creator + chef de projet + watchers — excluding the actor.
     */
    public function taskNotificationRecipients(Task $task, ?User $excludeActor): Collection
    {
        $task->loadMissing(['assignees', 'watchers']);

        $ids = collect();

        // Assignees
        $ids = $ids->merge($task->assignees->pluck('id'));

        // Creator
        if ($task->created_by) {
            $ids->push($task->created_by);
        }

        // Watchers
        $ids = $ids->merge($task->watchers->pluck('id'));

        // Chef de projet
        if ($task->project_id) {
            $chef = Project::find($task->project_id)?->chef_id;
            if ($chef) {
                $ids->push($chef);
            }
        }

        // Exclude actor
        if ($excludeActor) {
            $ids = $ids->filter(fn ($id) => $id !== $excludeActor->id);
        }

        $uniqueIds = $ids->filter()->unique()->values();

        return User::whereIn('id', $uniqueIds)->get();
    }

    /**
     * For a project: all members + followers — excluding the actor.
     */
    public function projectNotificationRecipients(Project $project, ?User $excludeActor): Collection
    {
        $project->loadMissing(['members', 'followers']);

        $ids = collect($project->members->pluck('id'))
            ->merge($project->followers->pluck('id'));

        if ($excludeActor) {
            $ids = $ids->filter(fn ($id) => $id !== $excludeActor->id);
        }

        return User::whereIn('id', $ids->unique()->values())->get();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Core notification creation
    // ──────────────────────────────────────────────────────────────────────────

    public function createNotification(
        User    $user,
        string  $type,
        string  $message,
        string  $severity,
        array   $data,
        ?int    $projectId = null,
        ?User   $actor = null,
    ): ?Notification {
        $user->refresh();

        if (! $this->userWantsNotificationType($user, $type)) {
            return null;
        }

        $inApp = (bool) ($user->notify_in_app ?? true);
        $email = (bool) ($user->notify_email ?? false);

        $notification = null;

        if ($inApp) {
            $data = array_merge(['message' => $message], $data);
            if ($projectId) {
                $data['project_id'] = $projectId;
            }

            $notification = Notification::create([
                'user_id'         => $user->id,
                'actor_id'        => $actor?->id,
                'related_task_id' => isset($data['task_id']) ? (int) $data['task_id'] : null,
                'entity_type'     => isset($data['task_id']) ? 'task' : (isset($data['project_id']) ? 'project' : null),
                'entity_id'       => $data['task_id'] ?? $data['project_id'] ?? null,
                'type'            => $type,
                'message'         => $message,
                'severity'        => $severity,
                'data'            => $data,
            ]);

            $this->broadcastCreated($notification);
        }

        if ($email) {
            $this->maybeSendEmail($user, $message, $data);
        }

        return $notification;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Payload builders
    // ──────────────────────────────────────────────────────────────────────────

    protected function taskPayload(Task $task, ?User $actor, array $extra = []): array
    {
        return array_merge([
            'task_id'          => $task->id,
            'task_title'       => $task->title,
            'project_id'       => $task->project_id,
            'actor_name'       => $actor?->name,
            'actor_avatar_url' => $this->userAvatarUrl($actor),
        ], $extra);
    }

    protected function projectPayload(Project $project, ?User $actor, array $extra = []): array
    {
        return array_merge([
            'project_id'       => $project->id,
            'project_name'     => $project->name,
            'actor_name'       => $actor?->name,
            'actor_avatar_url' => $this->userAvatarUrl($actor),
        ], $extra);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Preference check
    // ──────────────────────────────────────────────────────────────────────────

    protected function userWantsNotificationType(User $user, string $type): bool
    {
        return match (true) {
            $type === 'task_assigned'                => (bool) ($user->notify_type_task_assigned ?? true),
            in_array($type, ['task_comment', 'comment_added', 'task_mentioned', 'mention']) => (bool) ($user->notify_type_comment ?? true),
            in_array($type, ['task_delayed', 'task_overdue']) => (bool) ($user->notify_type_task_delayed ?? true),
            in_array($type, ['task_updated'])        => (bool) ($user->notify_type_task_updated ?? true),
            in_array($type, ['task_completed'])      => (bool) ($user->notify_type_task_completed ?? true),
            in_array($type, ['permission_updated'])  => (bool) ($user->notify_type_permission ?? true),
            in_array($type, ['invitation_received', 'project_invitation', 'project_invitation_accepted']) => (bool) ($user->notify_type_invitation ?? true),
            in_array($type, ['ai_alert', 'workload_alert', 'project_at_risk']) => (bool) ($user->notify_type_ai_alert ?? true),
            in_array($type, ['project_created', 'project_updated']) => (bool) ($user->notify_type_project ?? true),
            default => true,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Guard: dedup helpers
    // ──────────────────────────────────────────────────────────────────────────

    public function taskIsDelayed(Task $task): bool
    {
        if ($task->workflow_status === 'done' || (int) $task->progress_percent >= 100) {
            return false;
        }
        $pastDue   = $task->due_date && $task->due_date->isPast();
        $planBehind = $task->planned_end && $task->due_date && $task->planned_end->greaterThan($task->due_date);

        return $pastDue || $planBehind;
    }

    protected function hasUnreadOfTypeForTask(int $userId, string $type, int $taskId): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', $type)
            ->whereNull('read_at')
            ->get()
            ->contains(fn (Notification $n) => (int) data_get($n->data, 'task_id') === $taskId);
    }

    // Legacy alias
    protected function hasUnreadDelayedForTask(int $userId, int $taskId): bool
    {
        return $this->hasUnreadOfTypeForTask($userId, 'task_delayed', $taskId);
    }

    protected function hasOverloadNotificationToday(int $userId): bool
    {
        return Notification::where('user_id', $userId)
            ->where('type', 'workload_alert')
            ->whereDate('created_at', today())
            ->exists();
    }

    protected function hasProjectAtRiskNotificationToday(int $userId, int $projectId): bool
    {
        return Notification::where('user_id', $userId)
            ->where('type', 'project_at_risk')
            ->whereDate('created_at', today())
            ->get()
            ->contains(fn (Notification $n) => (int) data_get($n->data, 'project_id') === $projectId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Aggregation helpers
    // ──────────────────────────────────────────────────────────────────────────

    protected function countActiveTasksForUser(User $user): int
    {
        return Task::query()
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
            ->where('workflow_status', '!=', 'done')
            ->where('progress_percent', '<', 100)
            ->whereNull('archived_at')
            ->count();
    }

    protected function countDelayedTasksInProject(Project $project): int
    {
        return $project->tasks()
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->where('workflow_status', '!=', 'done')
            ->where('progress_percent', '<', 100)
            ->whereNull('archived_at')
            ->count();
    }

    protected function projectRiskRecipients(Project $project): Collection
    {
        $users = collect();
        $project->loadMissing('owner');
        if ($project->owner) {
            $users->push($project->owner);
        }
        if ($project->project_manager_id) {
            $pm = User::find($project->project_manager_id);
            if ($pm) {
                $users->push($pm);
            }
        }
        $users = $users->merge($project->members()->wherePivot('project_role', 'admin')->get());
        $users = $users->merge(User::role('admin')->get());

        return $users->filter()->unique('id')->values();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Broadcasting & email
    // ──────────────────────────────────────────────────────────────────────────

    private function broadcastCreated(Notification $notification): void
    {
        $unread = Notification::where('user_id', $notification->user_id)->whereNull('read_at')->count();
        broadcast(new NotificationCreated($notification, $unread))->toOthers();
    }

    private function maybeSendEmail(User $user, string $message, array $data): void
    {
        if (! ($user->notify_email ?? false)) {
            return;
        }
        if (in_array(config('mail.default'), ['log', 'array'])) {
            return;
        }

        $subject    = (string) ($data['title'] ?? 'Notification — IntelliPM');
        $frontend   = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $projectId  = isset($data['project_id']) ? (int) $data['project_id'] : null;
        $taskId     = isset($data['task_id'])    ? (int) $data['task_id']    : null;

        $projectName = $projectId ? Project::query()->whereKey($projectId)->value('name') : null;
        $taskName    = $taskId    ? Task::query()->whereKey($taskId)->value('title')       : null;

        $ctaLabel = $taskId ? 'Voir la tâche' : 'Voir le projet';
        $ctaUrl   = $taskId
            ? "{$frontend}/projects/{$projectId}?highlightTask={$taskId}"
            : ($projectId ? "{$frontend}/projects/{$projectId}" : "{$frontend}/notifications");

        try {
            Mail::to($user->email)->send(new TaskNotificationMail(
                subjectLine: $subject,
                title: $subject,
                message: $message,
                ctaLabel: $ctaLabel,
                ctaUrl: $ctaUrl,
                payload: array_merge($data, ['project_name' => $projectName, 'task_name' => $taskName]),
            ));
        } catch (\Throwable) {
            // email failure must not block in-app notification
        }
    }

    private function userAvatarUrl(?User $user): ?string
    {
        if (! $user) {
            return null;
        }
        $path = $user->avatar ?: $user->profile_photo;

        return $path ? '/storage/'.str_replace('\\', '/', $path) : null;
    }
}
