<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Mail\TaskNotificationMail;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /** Seuil de tâches actives avant alerte de surcharge. */
    public const OVERLOAD_ACTIVE_TASK_THRESHOLD = 12;

    /** Nombre minimum de tâches en retard pour signaler un projet à risque. */
    public const PROJECT_AT_RISK_MIN_DELAYED = 4;

    private function userAvatarUrl(?User $user): ?string
    {
        if (! $user) {
            return null;
        }
        $path = $user->avatar ?: $user->profile_photo;

        return $path ? '/storage/'.str_replace('\\', '/', $path) : null;
    }

    public function notifyTaskAssigned(Task $task, User $assignee, ?User $actor = null): ?Notification
    {
        $message = 'Une tâche vous a été assignée';

        return $this->createNotification(
            $assignee,
            'task_assigned',
            $message,
            'info',
            [
                'title' => 'Nouvelle assignation',
                'message' => $message,
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'assigned_by' => $actor?->id,
                'actor_name' => $actor?->name,
                'actor_avatar_url' => $this->userAvatarUrl($actor),
            ]
        );
    }

    public function notifyTaskCommentAdded(Task $task, User $recipient, int $commentId, ?User $actor = null): Notification
    {
        $message = 'Nouveau commentaire sur une tâche qui vous est assignée';

        return $this->createNotification(
            $recipient,
            'comment_added',
            $message,
            'info',
            [
                'title' => 'Commentaire',
                'message' => $message,
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'comment_id' => $commentId,
                'author_id' => $actor?->id,
                'actor_name' => $actor?->name,
                'actor_avatar_url' => $this->userAvatarUrl($actor),
            ]
        );
    }

    public function notifyTaskMentioned(Task $task, User $recipient, int $commentId, ?int $actorId = null): ?Notification
    {
        $message = 'Vous avez été mentionné dans un commentaire de tâche';

        return $this->createNotification(
            $recipient,
            'mention',
            $message,
            'info',
            [
                'title' => 'Mention',
                'message' => $message,
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'comment_id' => $commentId,
                'mentioned_by' => $actorId,
            ]
        );
    }

    public function notifyTaskDelayed(Task $task, ?User $actor = null): void
    {
        if (! $this->taskIsDelayed($task)) {
            return;
        }

        $assignees = $task->assignees()->get();
        foreach ($assignees as $assignee) {
            if ($this->hasUnreadDelayedForTask($assignee->id, $task->id)) {
                continue;
            }

            $message = 'La tâche est en retard';

            $this->createNotification(
                $assignee,
                'task_delayed',
                $message,
                'warning',
                [
                    'title' => 'Tâche en retard',
                    'message' => $message,
                    'task_id' => $task->id,
                    'project_id' => $task->project_id,
                    'triggered_by' => $actor?->id,
                ]
            );
        }
    }

    /**
     * Après une assignation : alerte si le membre a trop de tâches actives.
     */
    public function notifyOverloadIfNeeded(User $user): void
    {
        $count = $this->countActiveTasksForUser($user);
        if ($count < self::OVERLOAD_ACTIVE_TASK_THRESHOLD) {
            return;
        }

        if ($this->hasOverloadNotificationToday($user->id)) {
            return;
        }

        $message = 'Vous êtes surchargé';

        $this->createNotification(
            $user,
            'user_overload',
            $message,
            'warning',
            [
                'title' => 'Surcharge',
                'message' => $message,
                'active_task_count' => $count,
                'threshold' => self::OVERLOAD_ACTIVE_TASK_THRESHOLD,
            ]
        );
    }

    /**
     * Invité existant : notification « vous avez été invité » (lien d’acceptation).
     */
    public function notifyProjectInvitationPending(User $invitee, Project $project, User $inviter, ProjectInvitation $invitation): ?Notification
    {
        $message = sprintf('Vous avez été invité au projet « %s »', $project->name);

        return $this->createNotification(
            $invitee,
            'project_invitation',
            $message,
            'info',
            [
                'title' => 'Invitation au projet',
                'message' => $message,
                'project_id' => $project->id,
                'invitation_id' => $invitation->id,
                'token' => $invitation->token,
                'inviter_name' => $inviter->name,
                'inviter_avatar_url' => $this->userAvatarUrl($inviter),
            ]
        );
    }

    /**
     * Après inscription : notifier les invitations en attente pour cet e-mail.
     */
    public function notifyPendingInvitationsAfterRegistration(User $user): void
    {
        $email = mb_strtolower($user->email);

        $invitations = ProjectInvitation::query()
            ->whereRaw('LOWER(email) = ?', [$email])
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
        $message = sprintf('%s a rejoint le projet « %s »', $newMember->name, $project->name);

        return $this->createNotification(
            $inviter,
            'project_invitation_accepted',
            $message,
            'info',
            [
                'title' => 'Invitation acceptée',
                'message' => $message,
                'project_id' => $project->id,
                'invitee_id' => $newMember->id,
            ]
        );
    }

    /**
     * Alerter les administrateurs du projet si trop de tâches sont en retard.
     */
    public function notifyProjectAtRiskIfNeeded(Project $project): void
    {
        $delayed = $this->countDelayedTasksInProject($project);
        if ($delayed < self::PROJECT_AT_RISK_MIN_DELAYED) {
            return;
        }

        foreach ($this->projectRiskRecipients($project) as $admin) {
            if ($this->hasProjectAtRiskNotificationToday($admin->id, $project->id)) {
                continue;
            }

            $message = 'Le projet est à risque';

            $this->createNotification(
                $admin,
                'project_at_risk',
                $message,
                'alert',
                [
                    'title' => 'Projet à risque',
                    'message' => $message,
                    'project_id' => $project->id,
                    'delayed_task_count' => $delayed,
                ]
            );
        }
    }

    /**
     * Tâche planifiée / artisan : analyse retards, surcharge et risques projet.
     */
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

    public function taskIsDelayed(Task $task): bool
    {
        if ($task->workflow_status === 'done' || (int) $task->progress_percent >= 100) {
            return false;
        }

        $pastDue = $task->due_date && $task->due_date->isPast();
        $planBehind = $task->due_date && $task->planned_end && $task->planned_end->greaterThan($task->due_date);

        return $pastDue || $planBehind;
    }

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

    /**
     * @return Collection<int, User>
     */
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

        $users = $users->merge(
            $project->members()->wherePivot('project_role', 'admin')->get()
        );

        $users = $users->merge(User::role('admin')->get());

        return $users->filter()->unique('id')->values();
    }

    protected function hasUnreadDelayedForTask(int $userId, int $taskId): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'task_delayed')
            ->whereNull('read_at')
            ->get()
            ->contains(fn (Notification $n) => (int) data_get($n->data, 'task_id') === $taskId);
    }

    protected function hasOverloadNotificationToday(int $userId): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'user_overload')
            ->whereDate('created_at', today())
            ->exists();
    }

    protected function hasProjectAtRiskNotificationToday(int $userId, int $projectId): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'project_at_risk')
            ->whereDate('created_at', today())
            ->get()
            ->contains(fn (Notification $n) => (int) data_get($n->data, 'project_id') === $projectId);
    }

    protected function createNotification(
        User $user,
        string $type,
        string $message,
        string $severity,
        array $data
    ): ?Notification {
        $user->refresh();

        if (! $this->userWantsNotificationType($user, $type)) {
            return null;
        }

        $inApp = (bool) ($user->notify_in_app ?? true);
        $email = (bool) ($user->notify_email ?? false);

        $notification = null;

        if ($inApp) {
            $notification = Notification::create([
                'user_id' => $user->id,
                'related_task_id' => isset($data['task_id']) ? (int) $data['task_id'] : null,
                'type' => $type,
                'message' => $message,
                'severity' => $severity,
                'data' => $data,
            ]);

            $this->broadcastCreated($notification);
        }

        if ($email) {
            $this->maybeSendEmail($user, $message, $data);
        }

        return $notification;
    }

    /**
     * Filtre par type (assignation, commentaire / mention, retard).
     */
    protected function userWantsNotificationType(User $user, string $type): bool
    {
        return match ($type) {
            'task_assigned' => (bool) ($user->notify_type_task_assigned ?? true),
            'comment_added', 'mention' => (bool) ($user->notify_type_comment ?? true),
            'task_delayed' => (bool) ($user->notify_type_task_delayed ?? true),
            default => true,
        };
    }

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

        if (config('mail.default') === 'log' || config('mail.default') === 'array') {
            return;
        }

        $subject = (string) ($data['title'] ?? 'Notification — Gestion projets');
        $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $projectId = isset($data['project_id']) ? (int) $data['project_id'] : null;
        $taskId = isset($data['task_id']) ? (int) $data['task_id'] : null;

        $projectName = null;
        if ($projectId) {
            $projectName = Project::query()->whereKey($projectId)->value('name');
        }

        $taskName = null;
        if ($taskId) {
            $taskName = Task::query()->whereKey($taskId)->value('title');
        }

        $ctaLabel = $taskId ? 'Voir la tâche' : 'Voir le projet';
        $ctaUrl = $taskId
            ? "{$frontend}/projects/{$projectId}?highlightTask={$taskId}"
            : ($projectId ? "{$frontend}/projects/{$projectId}" : "{$frontend}/notifications");

        $payload = array_merge($data, [
            'project_name' => $projectName,
            'task_name' => $taskName,
        ]);

        try {
            Mail::to($user->email)->send(new TaskNotificationMail(
                subjectLine: $subject,
                title: $subject,
                message: $message,
                ctaLabel: $ctaLabel,
                ctaUrl: $ctaUrl,
                payload: $payload,
            ));
        } catch (\Throwable) {
            // Ne pas bloquer la création de notification in-app si l’e-mail échoue
        }
    }
}
