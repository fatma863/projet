<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectInvitation;
use App\Services\ActivityService;
use App\Services\MemberDashboardService;
use App\Services\NotificationService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InvitationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly ActivityService $activityService,
    ) {}

    /**
     * Vérification publique du jeton (sans auth) — pour la page d’acceptation.
     */
    public function verify(Request $request): JsonResponse
    {
        $token = $request->query('token');
        if (! is_string($token) || $token === '') {
            return response()->json([
                'valid' => false,
                'code' => 'missing_token',
                'message' => 'Lien d’invitation invalide.',
            ], 422);
        }

        $invitation = ProjectInvitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return response()->json([
                'valid' => false,
                'code' => 'invalid',
                'message' => 'Cette invitation est invalide ou a expiré.',
            ], 404);
        }

        $this->markExpiredIfNeeded($invitation);

        if ($invitation->status === ProjectInvitation::STATUS_ACCEPTED) {
            return response()->json([
                'valid' => false,
                'code' => 'already_accepted',
                'message' => 'Cette invitation a déjà été acceptée.',
            ], 410);
        }

        if ($invitation->status === 'declined') {
            return response()->json([
                'valid' => false,
                'code' => 'declined',
                'message' => 'Cette invitation a été refusée.',
            ], 410);
        }

        if ($invitation->status === 'expired' || $invitation->isExpired()) {
            return response()->json([
                'valid' => false,
                'code' => 'expired',
                'message' => 'Cette invitation a expiré.',
            ], 410);
        }

        $invitation->load(['project', 'inviter']);

        return response()->json([
            'valid' => true,
            'invitation' => $this->invitationPayload($invitation),
        ]);
    }

    /**
     * Invitations en attente pour l’utilisateur connecté (e-mail).
     */
    public function pending(Request $request): JsonResponse
    {
        $user = $request->user();
        $email = mb_strtolower($user->email);

        $candidates = ProjectInvitation::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('status', ProjectInvitation::STATUS_PENDING)
            ->with(['project', 'inviter'])
            ->orderByDesc('created_at')
            ->get();

        foreach ($candidates as $inv) {
            $this->markExpiredIfNeeded($inv);
        }

        $active = ProjectInvitation::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('status', ProjectInvitation::STATUS_PENDING)
            ->with(['project', 'inviter'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'invitations' => $active->map(fn (ProjectInvitation $inv) => $this->invitationPayload($inv))->values(),
            'pending_count' => $active->count(),
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $user = $request->user();

        $invitation = ProjectInvitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return response()->json(['message' => 'Invitation introuvable.'], 404);
        }

        $this->markExpiredIfNeeded($invitation);
        $invitation->refresh();

        if ($invitation->status !== 'pending' || $invitation->isExpired()) {
            return response()->json([
                'message' => $invitation->status === 'expired' || $invitation->isExpired()
                    ? 'Cette invitation a expiré.'
                    : 'Cette invitation n’est plus valide.',
            ], 422);
        }

        if (mb_strtolower($user->email) !== mb_strtolower($invitation->email)) {
            return response()->json([
                'message' => 'Connectez-vous avec l’adresse e-mail à laquelle l’invitation a été envoyée.',
            ], 403);
        }

        $project = $invitation->project()->first();
        if (! $project) {
            return response()->json(['message' => 'Projet introuvable.'], 404);
        }

        if (AccessControl::projectRole($user, $project) !== null || (int) $project->owner_id === (int) $user->id) {
            return response()->json(['message' => 'Vous êtes déjà membre de ce projet.'], 422);
        }

        DB::transaction(function () use ($invitation, $project, $user) {
            $role = AccessControl::normalizePivotRole($invitation->role) ?? 'member';

            if (Schema::hasTable('project_user')) {
                $project->users()->syncWithoutDetaching([
                    $user->id => ['role' => $role],
                ]);
            }
            $project->members()->syncWithoutDetaching([
                $user->id => ['project_role' => $role],
            ]);

            $invitation->update([
                'accepted_at' => now(),
                'status' => ProjectInvitation::STATUS_ACCEPTED,
            ]);
        });

        $invitation->refresh();
        $this->activityService->recordJoinedProject($user, $project, $invitation);
        MemberDashboardService::forgetCacheForUsers([$user->id]);

        $invitation->load(['project', 'inviter']);
        $inviter = $invitation->inviter;
        if ($inviter && $inviter->id !== $user->id) {
            $this->notificationService->notifyProjectInvitationAccepted($inviter, $project, $user);
        }

        return response()->json([
            'message' => 'Vous avez rejoint le projet.',
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
        ]);
    }

    public function decline(Request $request, string $token): JsonResponse
    {
        $user = $request->user();

        $invitation = ProjectInvitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return response()->json(['message' => 'Invitation introuvable.'], 404);
        }

        $this->markExpiredIfNeeded($invitation);
        $invitation->refresh();

        if ($invitation->status !== 'pending' || $invitation->isExpired()) {
            return response()->json(['message' => 'Cette invitation n’est plus valide.'], 422);
        }

        if (mb_strtolower($user->email) !== mb_strtolower($invitation->email)) {
            return response()->json(['message' => 'Compte e-mail incorrect pour cette invitation.'], 403);
        }

        $invitation->update([
            'declined_at' => now(),
            'status' => 'declined',
        ]);

        return response()->json(['message' => 'Invitation refusée.']);
    }

    private function markExpiredIfNeeded(ProjectInvitation $invitation): void
    {
        if ($invitation->status !== 'pending') {
            return;
        }
        if ($invitation->isExpired()) {
            $invitation->forceFill(['status' => 'expired'])->saveQuietly();
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function invitationPayload(ProjectInvitation $invitation): array
    {
        $invitation->loadMissing(['project', 'inviter']);

        return [
            'id' => $invitation->id,
            'token' => $invitation->token,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'status' => $invitation->status,
            'expires_at' => $invitation->expires_at?->toIso8601String(),
            'project' => $invitation->project ? [
                'id' => $invitation->project->id,
                'name' => $invitation->project->name,
                'code' => $invitation->project->code,
            ] : null,
            'invited_by' => $invitation->inviter ? [
                'id' => $invitation->inviter->id,
                'name' => $invitation->inviter->name,
                'email' => $invitation->inviter->email,
            ] : null,
        ];
    }
}
