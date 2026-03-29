<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Http\Resources\TeamMemberResource;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $teams = Team::withCount('members', 'projects')
            ->with(['leader', 'members'])
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when(!$user->hasRole('admin'), fn ($q) => $q->whereHas('members', fn ($m) => $m->where('users.id', $user->id)))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

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

        return response()->json([
            'message' => 'Équipe créée avec succès.',
            'team' => new TeamResource($team->load(['members', 'leader'])),
        ], 201);
    }

    public function show(Team $team): JsonResponse
    {
        $user = request()->user();
        if (!$user->hasRole('admin') && !$team->members()->where('users.id', $user->id)->exists()) {
            abort(403);
        }

        $team->loadCount('members', 'projects');
        $team->load(['members', 'leader']);

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

        return response()->json([
            'message' => 'Équipe mise à jour.',
            'team' => new TeamResource($team->load(['members', 'leader'])),
        ]);
    }

    public function destroy(Team $team): JsonResponse
    {
        if (!request()->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut supprimer une équipe.');
        }

        $team->delete();

        return response()->json(['message' => 'Équipe supprimée.']);
    }

    public function addMember(Request $request, Team $team): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_in_team' => 'sometimes|string|in:lead,developer,designer,tester,member',
            'capacity_hours_per_week' => 'sometimes|numeric|min:0|max:60',
            'skills' => 'sometimes|array',
        ]);

        $team->members()->syncWithoutDetaching([
            $data['user_id'] => [
                'role_in_team' => $data['role_in_team'] ?? 'member',
                'capacity_hours_per_week' => $data['capacity_hours_per_week'] ?? 40,
                'skills' => isset($data['skills']) ? json_encode($data['skills']) : null,
                'is_active' => true,
            ],
        ]);

        return response()->json([
            'message' => 'Membre ajouté à l\'équipe.',
            'members' => TeamMemberResource::collection($team->load('members')->members),
        ]);
    }

    public function removeMember(Team $team, int $userId): JsonResponse
    {
        if (!request()->user()->hasRole('admin')) {
            abort(403, 'Seul un admin peut gérer les membres d\'équipe.');
        }

        $team->members()->detach($userId);

        return response()->json(['message' => 'Membre retiré de l\'équipe.']);
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
                'role_in_team' => 'member',
                'capacity_hours_per_week' => 40,
                'is_active' => true,
            ];
        }

        $team->members()->sync($sync);
    }
}
