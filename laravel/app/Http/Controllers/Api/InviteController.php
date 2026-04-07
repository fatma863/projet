<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectInviteService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * API REST « invites » (alias du flux project_invitations / InvitationController).
 */
class InviteController extends Controller
{
    public function __construct(
        private readonly ProjectInviteService $projectInviteService,
        private readonly InvitationController $invitationController,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'email' => 'required|email|max:255',
            'role' => 'required|string|in:member,client',
        ]);

        $project = Project::query()->findOrFail($data['project_id']);
        Gate::authorize('view', $project);

        if (! AccessControl::canInviteToProject($request->user(), $project)) {
            return response()->json(['message' => 'Seuls les administrateurs du projet peuvent inviter.'], 403);
        }

        $inviteRole = AccessControl::normalizePivotRole($data['role']) ?? 'member';

        try {
            $result = $this->projectInviteService->createPendingInvitation(
                $project,
                $request->user(),
                $data['email'],
                $inviteRole
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $pending = $result['invitation'];

        return response()->json([
            'message' => 'Invitation créée. Partagez le lien ci-dessous (valide 48 h).',
            'invitation' => [
                'id' => $pending->id,
                'email' => $pending->email,
                'project_id' => $pending->project_id,
                'role' => $pending->role,
                'status' => $pending->status,
                'token' => $pending->token,
                'expires_at' => $pending->expires_at?->toIso8601String(),
            ],
            'invitation_path' => '/accept-invite?token='.urlencode($pending->token),
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $fake = Request::create('/api/invitations/verify', 'GET', ['token' => $token]);

        return $this->invitationController->verify($fake);
    }

    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|max:64']);

        return $this->invitationController->accept($request, $data['token']);
    }

    public function decline(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|max:64']);

        return $this->invitationController->decline($request, $data['token']);
    }
}
