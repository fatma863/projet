<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SpecialtyResource;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\Specialty;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpecialtyController extends Controller
{
    // ── Liste toutes les spécialités ─────────────────────────────────────────

    public function index(): JsonResponse
    {
        $specialties = Specialty::orderBy('name')->get();

        return response()->json([
            'specialties' => SpecialtyResource::collection($specialties),
        ]);
    }

    // ── Créer une spécialité (admin uniquement) ──────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:specialties,name',
            'description' => 'nullable|string|max:500',
            'color'       => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $specialty = Specialty::create($data);

        return response()->json([
            'specialty' => new SpecialtyResource($specialty),
            'message'   => 'Spécialité créée.',
        ], 201);
    }

    // ── Modifier une spécialité (admin uniquement) ───────────────────────────

    public function update(Request $request, Specialty $specialty): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100|unique:specialties,name,'.$specialty->id,
            'description' => 'nullable|string|max:500',
            'color'       => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $specialty->update($data);

        return response()->json([
            'specialty' => new SpecialtyResource($specialty),
            'message'   => 'Spécialité mise à jour.',
        ]);
    }

    // ── Supprimer une spécialité (admin uniquement) ──────────────────────────

    public function destroy(Specialty $specialty): JsonResponse
    {
        $specialty->delete();

        return response()->json(['message' => 'Spécialité supprimée.']);
    }

    // ── Membres compatibles avec une tâche ──────────────────────────────────

    public function matchingMembers(Task $task): JsonResponse
    {
        $requiredIds = $task->specialties()->pluck('specialties.id');

        if ($requiredIds->isEmpty()) {
            return response()->json([
                'matching_members' => [],
                'message'          => 'Cette tâche ne requiert aucune spécialité.',
            ]);
        }

        $projectMemberIds = $task->project
            ->users()
            ->pluck('users.id')
            ->merge($task->project->members()->pluck('users.id'))
            ->unique();

        $members = User::whereIn('id', $projectMemberIds)
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->with('specialties')
            ->get()
            ->map(function ($user) use ($requiredIds) {
                $userSpecialtyIds = $user->specialties->pluck('id');
                $matchCount = $userSpecialtyIds->intersect($requiredIds)->count();

                return array_merge((new UserResource($user))->resolve(), [
                    'specialties'    => SpecialtyResource::collection($user->specialties)->resolve(),
                    'match_count'    => $matchCount,
                    'is_recommended' => $matchCount > 0,
                ]);
            })
            ->sortByDesc('match_count')
            ->values();

        return response()->json([
            'matching_members' => $members,
        ]);
    }

    // ── Auto-assignation intelligente ────────────────────────────────────────
    //
    // Calcule un score sur 100 pour chaque membre du projet en fonction de :
    //   • Spécialité match     → 0–50 pts
    //   • Disponibilité        → 0–30 pts (moins de tâches actives = mieux)
    //   • Performance passée   → 0–20 pts (ratio tâches terminées / total)
    //
    // Query params :
    //   specialty_ids[]  — IDs des spécialités requises (optionnel mais recommandé)

    public function autoAssign(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'specialty_ids'   => 'nullable|array',
            'specialty_ids.*' => 'integer|exists:specialties,id',
        ]);

        $requiredIds = array_map('intval', $request->input('specialty_ids', []));

        // Membres du projet (deux pivots fusionnés)
        $projectMemberIds = $project->users()->pluck('users.id')
            ->merge($project->members()->pluck('users.id'))
            ->unique()
            ->values();

        if ($projectMemberIds->isEmpty()) {
            return response()->json([
                'best_user' => null,
                'top_users' => [],
                'message'   => 'Aucun membre dans ce projet.',
            ]);
        }

        $members = User::whereIn('id', $projectMemberIds)
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->with('specialties')
            ->get();

        $scored = $members->map(function (User $user) use ($requiredIds, $project) {
            $score = $this->computeScore($user, $requiredIds, $project);

            return [
                'id'             => $user->id,
                'name'           => $user->name,
                'email'          => $user->email,
                'avatar'         => $user->avatar,
                'score'          => $score,
                'specialties'    => $user->specialties->map(fn ($s) => [
                    'id'    => $s->id,
                    'name'  => $s->name,
                    'color' => $s->color,
                ])->values()->all(),
                'is_recommended' => $score >= 50,
            ];
        })
        ->filter(fn ($m) => $m['score'] > 0 || empty($requiredIds))
        ->sortByDesc('score')
        ->values();

        if ($scored->isEmpty()) {
            return response()->json([
                'best_user' => null,
                'top_users' => [],
                'message'   => 'Aucun membre disponible pour ces spécialités.',
            ]);
        }

        $topUsers = $scored->take(3)->values()->all();
        $bestUser = $topUsers[0];

        return response()->json([
            'best_user' => $bestUser,
            'top_users' => $topUsers,
            'message'   => "Meilleur candidat : {$bestUser['name']} ({$bestUser['score']}%)",
        ]);
    }

    // ── Spécialités de l'utilisateur connecté ───────────────────────────────

    public function mySpecialties(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('specialties');

        return response()->json([
            'specialties' => SpecialtyResource::collection($user->specialties),
        ]);
    }

    // ── Mettre à jour les spécialités de l'utilisateur connecté ─────────────

    public function syncMySpecialties(Request $request): JsonResponse
    {
        $data = $request->validate([
            'specialty_ids'   => 'required|array',
            'specialty_ids.*' => 'integer|exists:specialties,id',
        ]);

        $request->user()->specialties()->sync($data['specialty_ids']);

        $user = $request->user()->load('specialties');

        return response()->json([
            'specialties' => SpecialtyResource::collection($user->specialties),
            'message'     => 'Spécialités mises à jour.',
        ]);
    }

    // ── Calcul du score (0–100) ──────────────────────────────────────────────

    private function computeScore(User $user, array $requiredIds, Project $project): int
    {
        // ── 1. Score spécialité (0–50) ───────────────────────────────────────
        $specialtyScore = 0;

        if (!empty($requiredIds)) {
            $memberSpecIds = $user->specialties->pluck('id')->map(fn ($id) => (int) $id)->toArray();
            $matchCount    = count(array_intersect($memberSpecIds, $requiredIds));
            $totalRequired = count($requiredIds);

            if ($matchCount === 0) {
                return 0; // Aucune correspondance → non éligible
            }

            // Score proportionnel : 50 si toutes les spécialités sont couvertes
            $specialtyScore = (int) round(($matchCount / $totalRequired) * 50);
        } else {
            // Pas de spécialité requise : score neutre 25
            $specialtyScore = 25;
        }

        // ── 2. Score disponibilité (0–30) ────────────────────────────────────
        // Moins de tâches actives non terminées = plus disponible
        $activeTasks = Task::whereHas(
            'assignees',
            fn ($q) => $q->where('users.id', $user->id)
        )
            ->where('project_id', $project->id)
            ->whereNotIn('workflow_status', ['done'])
            ->count();

        $availabilityScore = max(0, 30 - ($activeTasks * 6));

        // ── 3. Score performance (0–20) ──────────────────────────────────────
        // Ratio tâches terminées / total assignées dans le projet
        $totalAssigned = Task::whereHas(
            'assignees',
            fn ($q) => $q->where('users.id', $user->id)
        )
            ->where('project_id', $project->id)
            ->count();

        if ($totalAssigned > 0) {
            $completedTasks   = Task::whereHas(
                'assignees',
                fn ($q) => $q->where('users.id', $user->id)
            )
                ->where('project_id', $project->id)
                ->where('workflow_status', 'done')
                ->count();
            $performanceScore = (int) round(($completedTasks / $totalAssigned) * 20);
        } else {
            $performanceScore = 10; // Score neutre si aucun historique
        }

        return min(100, $specialtyScore + $availabilityScore + $performanceScore);
    }
}
