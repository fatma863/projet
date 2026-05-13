<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SpecialtyResource;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\Specialty;
use App\Models\Task;
use App\Models\User;
use App\Services\ML\PythonMLClient;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    // ── Auto-assignation intelligente (moteur ML) ────────────────────────────
    //
    // Délègue au service Python FastAPI (GBM+RF, 22 features).
    // Si le service est hors ligne, retourne une réponse vide sans erreur.
    //
    // Query params :
    //   specialty_ids[]  — IDs des spécialités requises
    //   priority         — priorité de la tâche (low/medium/high/urgent)
    //   issue_type       — type (task/bug/story)
    //   complexity       — complexité 1–10
    //   estimated_hours  — heures estimées
    //   planned_end      — date de livraison prévue
    //   sprint_id        — sprint actif
    //   top_n            — nombre de candidats retournés (défaut 5)

    public function autoAssign(Request $request, Project $project, PythonMLClient $ml): JsonResponse
    {
        $request->validate([
            'specialty_ids'    => 'nullable|array',
            'specialty_ids.*'  => 'integer|exists:specialties,id',
            'priority'         => 'nullable|in:low,medium,high,urgent',
            'issue_type'       => 'nullable|in:task,bug,story',
            'complexity'       => 'nullable|integer|min:1|max:10',
            'estimated_hours'  => 'nullable|numeric|min:0',
            'planned_end'      => 'nullable|date',
            'sprint_id'        => 'nullable|integer',
            'top_n'            => 'nullable|integer|min:1|max:10',
        ]);

        $taskAttributes = array_filter([
            'priority'         => $request->input('priority', 'medium'),
            'issue_type'       => $request->input('issue_type', 'task'),
            'complexity'       => (int)$request->input('complexity', 5),
            'estimated_hours'  => $request->input('estimated_hours'),
            'planned_end'      => $request->input('planned_end'),
            'sprint_id'        => $request->input('sprint_id'),
            'specialty_ids'    => array_map('intval', $request->input('specialty_ids', [])),
        ], fn($v) => $v !== null && $v !== '');

        $topN   = (int)$request->input('top_n', 5);
        $result = $ml->recommendForNewTask($taskAttributes, $project->id, $topN);

        if (empty($result['candidates'])) {
            return response()->json([
                'best_user'  => null,
                'top_users'  => [],
                'candidates' => [],
                'model_info' => $result['model_info'],
                'message'    => 'Aucun membre disponible ou éligible pour ces critères.',
            ]);
        }

        $candidates = $result['candidates'];
        $best       = $candidates[0];

        // Map to legacy shape for backward-compat + new ML fields
        $topUsers = array_map(function ($c) {
            return [
                'id'               => $c['user_id'],
                'name'             => $c['name'],
                'email'            => $c['email'],
                'avatar'           => $c['avatar'],
                'score'            => (int)round($c['score']),
                'relative_score'   => $c['relative_score'] ?? 100,
                'is_recommended'   => $c['score'] >= 50,
                'strengths'        => $c['strengths']  ?? [],
                'weaknesses'       => $c['weaknesses'] ?? [],
                'feature_breakdown' => $c['feature_breakdown'] ?? [],
                'stats'            => $c['stats']      ?? [],
            ];
        }, $candidates);

        return response()->json([
            'best_user'  => $topUsers[0],
            'top_users'  => array_slice($topUsers, 0, 3),
            'candidates' => $topUsers,
            'model_info' => $result['model_info'],
            'message'    => "Meilleur candidat ML : {$best['name']} (score {$best['score']}%)",
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

    // ── Tableau de performance des membres du projet ─────────────────────────

    public function membersPerformance(Request $request, Project $project): JsonResponse
    {
        $viewer    = $request->user();
        $canSeeAll = AccessControl::canEditProject($viewer, $project);

        $memberIds = collect()
            ->merge(DB::table('project_user')->where('project_id', $project->id)->pluck('user_id'))
            ->merge(DB::table('project_members')->where('project_id', $project->id)->pluck('user_id'))
            ->unique()
            ->values();

        // Membres non-admin/chef : seulement leurs propres données
        if (! $canSeeAll) {
            $memberIds = $memberIds->filter(fn ($id) => (int) $id === (int) $viewer->id)->values();
        }

        $members = User::whereIn('id', $memberIds)
            ->with('specialties')
            ->get();

        $cutoff30 = now()->subDays(30);
        $stats    = [];

        foreach ($members as $member) {
            $tasks = DB::table('task_assignments as ta')
                ->join('tasks as t', 't.id', '=', 'ta.task_id')
                ->where('ta.user_id', $member->id)
                ->where('t.project_id', $project->id)
                ->whereNull('t.deleted_at')
                ->select([
                    'ta.created_at as assigned_at',
                    't.id', 't.title', 't.workflow_status', 't.priority',
                    't.issue_type', 't.estimated_hours', 't.actual_hours',
                    't.due_date', 't.updated_at', 't.planned_start', 't.planned_end',
                    't.complexity',
                ])
                ->orderByDesc('t.updated_at')
                ->get();

            $done   = $tasks->where('workflow_status', 'done');
            $active = $tasks->whereIn('workflow_status', ['in_progress', 'at_risk']);

            // Priority breakdown for completed tasks
            $byPriority = [];
            foreach (['urgent', 'high', 'medium', 'low'] as $p) {
                $byPriority[$p] = $done->where('priority', $p)->count();
            }

            // On-time rate
            $doneWithDue = $done->filter(fn ($t) => !is_null($t->due_date));
            $onTime      = $doneWithDue->filter(fn ($t) => $t->updated_at <= $t->due_date)->count();
            $onTimeRate  = $doneWithDue->count() > 0
                ? round($onTime / $doneWithDue->count() * 100, 1)
                : null;

            // Average actual hours on done tasks
            $doneWithHours = $done->filter(fn ($t) => $t->actual_hours > 0);
            $avgHours = $doneWithHours->count() > 0
                ? round($doneWithHours->avg('actual_hours'), 1)
                : null;

            // Average days to complete (cap outliers >90 d)
            $deltas = [];
            foreach ($done as $t) {
                if ($t->assigned_at && $t->updated_at) {
                    $delta = (strtotime($t->updated_at) - strtotime($t->assigned_at)) / 86400;
                    if ($delta > 0 && $delta <= 90) {
                        $deltas[] = $delta;
                    }
                }
            }
            $avgDays = count($deltas) > 0
                ? round(array_sum($deltas) / count($deltas), 1)
                : null;

            // Hours accuracy (1 – mean relative error, %)
            $doneWithBoth = $done->filter(fn ($t) => $t->actual_hours > 0 && $t->estimated_hours > 0);
            $hoursAccuracy = null;
            if ($doneWithBoth->count() > 0) {
                $meanErr = $doneWithBoth->avg(
                    fn ($t) => min(abs($t->actual_hours - $t->estimated_hours) / $t->estimated_hours, 1)
                );
                $hoursAccuracy = round((1 - $meanErr) * 100, 1);
            }

            // Composite performance score (0–100)
            $completionRate = $tasks->count() > 0 ? $done->count() / $tasks->count() : 0;
            $score = (int) round(
                $completionRate * 40 +
                (($onTimeRate ?? 50) / 100) * 35 +
                min($done->count() / 10, 1) * 25
            );

            // 30-day velocity
            $velocity30 = $done->filter(
                fn ($t) => $t->updated_at >= $cutoff30->toDateTimeString()
            )->count();

            $avatarPath = $member->avatar ?: $member->profile_photo;
            $avatarUrl  = $avatarPath
                ? '/storage/'.str_replace('\\', '/', $avatarPath)
                : null;

            $stats[] = [
                'id'          => $member->id,
                'name'        => $member->name,
                'email'       => $member->email,
                'avatar_url'  => $avatarUrl,
                'specialties' => $member->specialties->map(fn ($s) => [
                    'id' => $s->id, 'name' => $s->name, 'color' => $s->color,
                ])->values(),
                'tasks_total'          => $tasks->count(),
                'tasks_done'           => $done->count(),
                'tasks_active'         => $active->count(),
                'tasks_todo'           => $tasks->where('workflow_status', 'todo')->count(),
                'tasks_at_risk'        => $tasks->where('workflow_status', 'at_risk')->count(),
                'done_by_priority'     => $byPriority,
                'avg_actual_hours'     => $avgHours,
                'avg_days_to_complete' => $avgDays,
                'on_time_rate'         => $onTimeRate,
                'hours_accuracy'       => $hoursAccuracy,
                'performance_score'    => $score,
                'velocity_30d'         => $velocity30,
                'tasks_list'           => $done->take(20)->map(fn ($t) => [
                    'id'              => $t->id,
                    'title'           => $t->title,
                    'priority'        => $t->priority,
                    'issue_type'      => $t->issue_type,
                    'planned_start'   => $t->planned_start,
                    'planned_end'     => $t->planned_end,
                    'estimated_hours' => $t->estimated_hours,
                    'actual_hours'    => $t->actual_hours,
                    'completed_at'    => $t->updated_at,
                ])->values(),
            ];
        }

        usort($stats, fn ($a, $b) => $b['performance_score'] <=> $a['performance_score']);

        return response()->json([
            'members'          => $stats,
            'is_personal_view' => ! $canSeeAll,
        ]);
    }

}
