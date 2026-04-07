<?php

namespace App\Services;

use App\Mail\ProjectInvitationMail;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Création d’invitations projet (réutilisé par ProjectController et InviteController).
 */
class ProjectInviteService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return array{invitation: ProjectInvitation, existing_user: ?User}
     */
    public function createPendingInvitation(Project $project, User $inviter, string $email, string $role): array
    {
        $email = mb_strtolower(trim($email));

        $existing = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($existing) {
            if ($project->users()->where('users.id', $existing->id)->exists()
                || $project->members()->where('users.id', $existing->id)->exists()) {
                throw new \InvalidArgumentException('Cet utilisateur est déjà membre du projet.');
            }
        }

        $pending = ProjectInvitation::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'email' => $email,
            ],
            [
                'role' => $role,
                'invited_by' => $inviter->id,
                'token' => (string) Str::uuid(),
                'expires_at' => now()->addHours(48),
                'accepted_at' => null,
                'declined_at' => null,
                'status' => ProjectInvitation::STATUS_PENDING,
            ]
        );

        $pending->load(['project', 'inviter']);

        $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $acceptUrl = "{$frontend}/accept-invite?token=".urlencode((string) $pending->token);
        $roleLabel = $role === 'client' ? 'Client' : 'Membre';

        try {
            Mail::to($email)->send(new ProjectInvitationMail(
                inviteeName: $existing?->name ?? '',
                inviterName: $inviter->name,
                projectName: $project->name,
                roleLabel: $roleLabel,
                acceptUrl: $acceptUrl,
            ));
        } catch (\Throwable $e) {
            Log::warning('Envoi e-mail invitation échoué', [
                'invitation_id' => $pending->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }

        if ($existing) {
            $this->notificationService->notifyProjectInvitationPending($existing, $project, $inviter, $pending);
        }

        Log::info('Invitation projet (e-mail non envoyé — simulation)', [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'email' => $email,
            'role' => $role,
            'invitation_id' => $pending->id,
            'token' => $pending->token,
        ]);

        return ['invitation' => $pending, 'existing_user' => $existing];
    }
}
