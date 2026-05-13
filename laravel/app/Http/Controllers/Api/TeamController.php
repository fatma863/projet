<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SpecialtyResource;
use App\Http\Resources\TeamMemberResource;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\User;
use App\Services\ActivityService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function __construct(
        private readonly ActivityService $activityService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $teams = Team::withCount('members', 'projects')
            ->with(['leader', 'members.specialties'])
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when(!$user->hasRole('admin'), fn ($q) => $q->whereHas('members', fn ($m) => $m->where('users.id', $user->id)))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        $teams->getCollection()->each(fn (Team $team) => $team->enrichMembersWithProjectRoles());

        return response()->json(TeamResource::collection($teams)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut créer une équipe.');
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'team_leader_id' => 'required|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
        ]);

        $leaderId = (int) $data['team_leader_id'];

        $team = Team::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'team_leader_id' => $leaderId,
        ]);

        $this->syncTeamMembers($team, $leaderId, $data['members'] ?? []);

        $this->activityService->recordEntityAction(
            $request->user(),
            'created_team',
            'team',
            (int) $team->id,
            [
                'team_name' => $team->name,
            ]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message' => 'Équipe créée avec succès.',
            'team' => new TeamResource($team),
        ], 201);
    }

    public function show(Team $team): JsonResponse
    {
        $user = request()->user();
        if (!$user->hasRole('admin') && !$team->members()->where('users.id', $user->id)->exists()) {
            abort(403);
        }

        $team->loadCount('members', 'projects');
        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json(['team' => new TeamResource($team)]);
    }

    public function update(Request $request, Team $team): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut modifier une équipe.');
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'team_leader_id' => 'sometimes|required|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
        ]);

        if (array_key_exists('name', $data)) {
            $team->name = $data['name'];
        }
        if (array_key_exists('description', $data)) {
            $team->description = $data['description'];
        }
        if (array_key_exists('team_leader_id', $data)) {
            $team->team_leader_id = (int) $data['team_leader_id'];
        }
        $team->save();

        if ($request->filled('team_leader_id') || $request->exists('members')) {
            $leaderId = (int) $team->team_leader_id;
            if (!$leaderId) {
                return response()->json(['message' => 'Un chef d\'équipe est requis pour synchroniser les membres.'], 422);
            }
            $this->syncTeamMembers($team, $leaderId, $request->input('members', []));
        }

        $this->activityService->recordEntityAction(
            $request->user(),
            'updated_team',
            'team',
            (int) $team->id,
            [
                'team_name' => $team->name,
            ]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message' => 'Équipe mise à jour.',
            'team' => new TeamResource($team),
        ]);
    }

    public function destroy(Team $team): JsonResponse
    {
        if (!request()->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut supprimer une équipe.');
        }

        $this->activityService->recordEntityAction(
            request()->user(),
            'deleted_team',
            'team',
            (int) $team->id,
            [
                'team_name' => $team->name,
            ]
        );

        $team->delete();

        return response()->json(['message' => 'Équipe supprimée.']);
    }

    public function addMember(Request $request, Team $team): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        $data = $request->validate([
            'user_id'                  => 'required|exists:users,id',
            'role_in_team'             => 'sometimes|string|in:lead,developer,tester,member,designer',
            'capacity_hours_per_week'  => 'sometimes|numeric|min:0|max:60',
            'skills'                   => 'sometimes|array',
            'specialty_ids'            => 'sometimes|array',
            'specialty_ids.*'          => 'integer|exists:specialties,id',
        ]);

        $jobRole = TeamMemberResource::normalizeJobRole($data['role_in_team'] ?? 'developer');

        $team->members()->syncWithoutDetaching([
            $data['user_id'] => [
                'role_in_team'            => $jobRole,
                'capacity_hours_per_week' => $data['capacity_hours_per_week'] ?? 40,
                'skills'                  => isset($data['skills']) ? json_encode($data['skills']) : null,
                'is_active'               => true,
            ],
        ]);

        // Sync spécialités sur l'utilisateur (compétences globales)
        if (isset($data['specialty_ids'])) {
            $member = User::findOrFail($data['user_id']);
            $member->specialties()->sync($data['specialty_ids']);
        }

        $this->activityService->recordEntityAction(
            $request->user(),
            'team_member_added',
            'team',
            (int) $team->id,
            [
                'member_id' => (int) $data['user_id'],
            ]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message' => 'Membre ajouté à l\'équipe.',
            'members' => TeamMemberResource::collection($team->members),
        ]);
    }

    public function removeMember(Team $team, int $userId): JsonResponse
    {
        if (!request()->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        $team->members()->detach($userId);

        $this->activityService->recordEntityAction(
            request()->user(),
            'team_member_removed',
            'team',
            (int) $team->id,
            [
                'member_id' => (int) $userId,
            ]
        );

        return response()->json(['message' => 'Membre retiré de l\'équipe.']);
    }

    public function updateMember(Request $request, Team $team, int $userId): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        if (!$team->members()->where('users.id', $userId)->exists()) {
            return response()->json(['message' => 'Membre introuvable dans cette équipe.'], 404);
        }

        $data = $request->validate([
            'role_in_team' => 'required|string|in:lead,developer,tester,member,designer,qa',
        ]);

        $jobRole = TeamMemberResource::normalizeJobRole($data['role_in_team']);

        $team->members()->updateExistingPivot($userId, [
            'role_in_team' => $jobRole,
        ]);

        if ($jobRole === 'lead' && (int) $team->team_leader_id !== $userId) {
            // Demote all previous leads to developer
            $team->members()
                ->wherePivot('role_in_team', 'lead')
                ->where('users.id', '!=', $userId)
                ->get()
                ->each(fn ($m) => $team->members()->updateExistingPivot($m->id, ['role_in_team' => 'developer']));

            $team->team_leader_id = $userId;
            $team->save();
        }

        $this->activityService->recordEntityAction(
            $request->user(),
            'team_member_role_updated',
            'team',
            (int) $team->id,
            [
                'member_id' => $userId,
                'role_in_team' => $jobRole,
            ]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message' => 'Fonction du membre mise à jour.',
            'members' => TeamMemberResource::collection($team->members),
            'team' => new TeamResource($team),
        ]);
    }

    public function updateMemberProjectRole(Request $request, Team $team, int $userId): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        if (!$team->members()->where('users.id', $userId)->exists()) {
            return response()->json(['message' => 'Membre introuvable dans cette équipe.'], 404);
        }

        $data = $request->validate([
            'project_role' => 'required|string|in:admin,member,client',
        ]);

        $normalizedRole = AccessControl::normalizePivotRole($data['project_role']) ?? 'member';

        $teamProjects = $team->projects()->get();
        foreach ($teamProjects as $project) {
            $project->members()->syncWithoutDetaching([
                $userId => ['project_role' => $normalizedRole],
            ]);

            $project->users()->syncWithoutDetaching([
                $userId => ['role' => $normalizedRole],
            ]);
        }

        $this->activityService->recordEntityAction(
            $request->user(),
            'team_member_project_role_updated',
            'team',
            (int) $team->id,
            [
                'member_id' => $userId,
                'project_role' => $normalizedRole,
            ]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message' => 'Accès projet du membre mis à jour.',
            'members' => TeamMemberResource::collection($team->members),
            'team' => new TeamResource($team),
        ]);
    }

    public function updateMemberSpecialties(Request $request, Team $team, int $userId): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les spécialités des membres.');
        }

        if (!$team->members()->where('users.id', $userId)->exists()) {
            return response()->json(['message' => 'Membre introuvable dans cette équipe.'], 404);
        }

        $data = $request->validate([
            'specialty_ids'   => 'required|array',
            'specialty_ids.*' => 'integer|exists:specialties,id',
        ]);

        $user = User::findOrFail($userId);
        $user->specialties()->sync($data['specialty_ids']);

        $this->activityService->recordEntityAction(
            $request->user(),
            'team_member_specialties_updated',
            'team',
            (int) $team->id,
            ['member_id' => $userId]
        );

        $team->load(['members.specialties', 'leader']);
        $team->enrichMembersWithProjectRoles();

        return response()->json([
            'message'     => 'Spécialités du membre mises à jour.',
            'members'     => TeamMemberResource::collection($team->members),
            'specialties' => SpecialtyResource::collection($user->fresh()->specialties),
        ]);
    }

    /**
     * @param  array<int>  $memberIds  Additional members (excluding leader; leader gets role lead).
     */
    private function syncTeamMembers(Team $team, int $leaderId, array $memberIds): void
    {
        $extra = collect($memberIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->reject(fn (int $id) => $id === $leaderId)
            ->values();

        $sync = [
            $leaderId => [
                'role_in_team' => 'lead',
                'capacity_hours_per_week' => 40,
                'is_active' => true,
            ],
        ];

        foreach ($extra as $uid) {
            $sync[$uid] = [
                'role_in_team' => 'developer',
                'capacity_hours_per_week' => 40,
                'is_active' => true,
            ];
        }

        $team->members()->sync($sync);
    }
}
