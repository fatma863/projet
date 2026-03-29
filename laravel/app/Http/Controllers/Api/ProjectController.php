<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\TaskStatus;
use App\Models\User;
use App\Services\AIService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with(['owner', 'team', 'manager'])
            ->withCount('members', 'tasks')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->team_id, fn ($q, $t) => $q->where('team_id', $t))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('name', 'like', "%{$s}%")
                   ->orWhere('code', 'like', "%{$s}%");
            }))
            ->orderByDesc('updated_at');

        // Non-admin : propriétaire, project_user, project_members ; optionnellement tâches assignées (hors invité global).
        if (! AccessControl::isAdmin($user)) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('users', fn ($q2) => $q2->where('users.id', $user->id))
                    ->orWhereHas('members', fn ($q2) => $q2->where('users.id', $user->id));

                if (! $user->hasRole('viewer')) {
                    $q->orWhereHas('tasks.assignees', fn ($q2) => $q2->where('users.id', $user->id));
                }
            });
        }

        $projects = $query->paginate($request->per_page ?? 15);

        return response()->json(ProjectResource::collection($projects)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Project::class);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:projects,code',
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'client_id' => 'nullable|exists:clients,id',
            'project_manager_id' => 'required|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'cost_per_hour' => 'sometimes|numeric|min:0',
        ]);

        $membersPayload = $data['members'] ?? [];
        unset($data['members']);

        $data['owner_id'] = $request->user()->id;
        $data['created_by'] = $request->user()->id;

        $project = Project::create($data);

        $this->syncProjectMemberships($project, [
            'project_manager_id' => $project->project_manager_id,
            'members' => $membersPayload,
        ]);

        // Create default Kanban statuses
        $defaultStatuses = [
            ['name' => 'À faire', 'color' => '#6B7280', 'order' => 0, 'is_default' => true],
            ['name' => 'En cours', 'color' => '#3B82F6', 'order' => 1],
            ['name' => 'En revue', 'color' => '#F59E0B', 'order' => 2],
            ['name' => 'Terminé', 'color' => '#10B981', 'order' => 3],
        ];
        foreach ($defaultStatuses as $status) {
            $project->statuses()->create($status);
        }

        $this->recalculateProjectCosts($project);
        $project->load('owner', 'members', 'statuses', 'client', 'manager');

        return response()->json([
            'message' => 'Projet créé avec succès.',
            'project' => new ProjectResource($project),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $project->load('owner', 'team', 'members', 'statuses', 'client', 'manager')
                ->loadCount('members', 'tasks');

        return response()->json(['project' => new ProjectResource($project)]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:10|unique:projects,code,' . $project->id,
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'client_id' => 'nullable|exists:clients,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'owner_id' => 'sometimes|exists:users,id',
            'cost_per_hour' => 'sometimes|numeric|min:0',
        ]);

        $shouldSyncMembers = $request->has('project_manager_id') || $request->has('members');
        $membersPayload = $data['members'] ?? null;
        unset($data['members']);

        $project->update($data);
        $project->refresh();

        if ($shouldSyncMembers) {
            $extraMembers = $membersPayload !== null
                ? $membersPayload
                : $this->extraMemberIdsFromProject($project);
            $this->syncProjectMemberships($project, [
                'project_manager_id' => $project->project_manager_id,
                'members' => $extraMembers,
            ]);
        }

        $this->recalculateProjectCosts($project);
        $project->load('owner', 'team', 'members', 'statuses', 'client', 'manager');

        return response()->json([
            'message' => 'Projet mis à jour.',
            'project' => new ProjectResource($project),
        ]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        return response()->json(['message' => 'Projet supprimé.']);
    }

    public function dashboard(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()->with('status', 'assignees')->get();
        $statuses = $project->statuses;

        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('progress_percent', 100)->count();
        $overdueTasks = $tasks->filter(fn ($t) => $t->isOverdue())->count();
        $avgProgress = $totalTasks > 0 ? round($tasks->avg('progress_percent'), 1) : 0;
        $this->recalculateProjectCosts($project);
        $project->refresh();

        $ai = $this->aiService->projectDashboardInsights($project);

        $tasksByStatus = $statuses->map(fn ($s) => [
            'status' => $s->name,
            'color' => $s->color,
            'count' => $tasks->where('status_id', $s->id)->count(),
        ]);

        $tasksByPriority = collect(['urgent', 'high', 'medium', 'low'])->map(fn ($p) => [
            'priority' => $p,
            'count' => $tasks->where('priority', $p)->count(),
        ]);

        return response()->json([
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => $overdueTasks,
            'avg_progress' => $avgProgress,
            'total_estimated_hours' => $ai['estimated_hours_total'],
            'total_actual_hours' => $ai['actual_hours_total'],
            'ai_tasks_at_risk' => $ai['ai_tasks_at_risk'],
            'workload_by_member' => $ai['workload_by_member'],
            'estimated_vs_actual' => [
                'estimated' => $ai['estimated_hours_total'],
                'actual' => $ai['actual_hours_total'],
                'delta' => round($ai['estimated_hours_total'] - $ai['actual_hours_total'], 1),
            ],
            'estimated_cost' => $project->estimated_cost !== null ? (float) $project->estimated_cost : null,
            'actual_cost' => $project->actual_cost !== null ? (float) $project->actual_cost : null,
            'cost_per_hour' => $project->cost_per_hour !== null ? (float) $project->cost_per_hour : null,
            'tasks_by_status' => $tasksByStatus,
            'tasks_by_priority' => $tasksByPriority,
        ]);
    }

    public function activity(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $activities = $project->activityLogs()
            ->with('actor')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'activities' => ActivityLogResource::collection($activities),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    public function members(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json([
            'members' => $this->mergedProjectMembers($project),
        ]);
    }

    public function addMember(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_role' => 'sometimes|string|in:admin,member,guest,viewer',
        ]);

        $normalizedRole = $data['project_role'] ?? 'member';
        if ($normalizedRole === 'viewer') {
            $normalizedRole = 'guest';
        }

        $project->members()->syncWithoutDetaching([
            $data['user_id'] => ['project_role' => $normalizedRole],
        ]);
        if (\Illuminate\Support\Facades\Schema::hasTable('project_user')) {
            $project->users()->syncWithoutDetaching([
                $data['user_id'] => ['role' => $normalizedRole],
            ]);
        }

        return response()->json([
            'message' => 'Membre ajouté au projet.',
            'members' => $this->mergedProjectMembers($project->fresh()),
        ]);
    }

    public function removeMember(Request $request, Project $project, int $userId): JsonResponse
    {
        Gate::authorize('update', $project);

        if ($project->owner_id === $userId) {
            return response()->json(['message' => 'Impossible de retirer le propriétaire du projet.'], 422);
        }

        $project->members()->detach($userId);
        if (\Illuminate\Support\Facades\Schema::hasTable('project_user')) {
            $project->users()->detach($userId);
        }

        return response()->json(['message' => 'Membre retiré du projet.']);
    }

    /**
     * Invitation par e-mail (membre ou invité lecture seule).
     * Si l'utilisateur existe : rattachement immédiat à project_user.
     * Sinon : enregistrement d'une invitation (e-mail simulé via log).
     */
    public function invite(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        if (! AccessControl::canInviteToProject($request->user(), $project)) {
            return response()->json(['message' => 'Seuls les administrateurs du projet peuvent inviter des membres.'], 403);
        }

        $data = $request->validate([
            'email' => 'required|email|max:255',
            'role' => 'required|string|in:member,guest',
        ]);

        $email = mb_strtolower($data['email']);

        $existing = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($existing) {
            if ($project->users()->where('users.id', $existing->id)->exists()) {
                return response()->json(['message' => 'Cet utilisateur est déjà membre du projet.'], 422);
            }

            $project->users()->syncWithoutDetaching([
                $existing->id => ['role' => $data['role']],
            ]);
            $project->members()->syncWithoutDetaching([
                $existing->id => ['project_role' => $data['role']],
            ]);

            ProjectInvitation::query()
                ->where('project_id', $project->id)
                ->whereRaw('LOWER(email) = ?', [$email])
                ->delete();

            return response()->json([
                'message' => 'Utilisateur ajouté au projet.',
                'user_attached' => true,
                'user' => [
                    'id' => $existing->id,
                    'email' => $existing->email,
                    'name' => $existing->name,
                ],
            ]);
        }

        $pending = ProjectInvitation::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'email' => $email,
            ],
            [
                'role' => $data['role'],
                'invited_by' => $request->user()->id,
                'token' => Str::random(64),
                'expires_at' => now()->addDays(14),
                'accepted_at' => null,
            ]
        );

        Log::info('Invitation projet (e-mail non envoyé — simulation)', [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'email' => $email,
            'role' => $data['role'],
            'invitation_id' => $pending->id,
            'token' => $pending->token,
        ]);

        return response()->json([
            'message' => 'Invitation enregistrée. Un e-mail serait envoyé à l’adresse indiquée lorsque le compte existera.',
            'user_attached' => false,
            'invitation' => [
                'id' => $pending->id,
                'email' => $pending->email,
                'role' => $pending->role,
                'expires_at' => $pending->expires_at?->toISOString(),
            ],
        ], 201);
    }

    public function recalculateCosts(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $this->recalculateProjectCosts($project);
        $project->refresh();

        return response()->json([
            'message' => 'Coûts projet recalculés.',
            'estimated_cost' => (float) $project->estimated_cost,
            'actual_cost' => (float) $project->actual_cost,
            'cost_per_hour' => (float) $project->cost_per_hour,
        ]);
    }

    /**
     * @param  array{project_manager_id?: int|null, members?: array<int>}  $meta
     */
    private function syncProjectMemberships(Project $project, array $meta): void
    {
        $creatorId = (int) $project->owner_id;
        $pmRaw = $meta['project_manager_id'] ?? $project->project_manager_id;
        $pmId = $pmRaw !== null && $pmRaw !== '' ? (int) $pmRaw : null;

        $extraIds = collect($meta['members'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->reject(fn (int $id) => $id === $creatorId || ($pmId !== null && $id === $pmId))
            ->values();

        $memberPivot = [];
        $memberPivot[$creatorId] = ['project_role' => 'owner'];
        if ($pmId !== null && $pmId !== $creatorId) {
            $memberPivot[$pmId] = ['project_role' => 'admin'];
        }
        foreach ($extraIds as $uid) {
            if (! isset($memberPivot[$uid])) {
                $memberPivot[$uid] = ['project_role' => 'member'];
            }
        }
        $project->members()->sync($memberPivot);

        if (Schema::hasTable('project_user')) {
            $pu = [];
            $pu[$creatorId] = ['role' => 'admin'];
            if ($pmId !== null && $pmId !== $creatorId) {
                $pu[$pmId] = ['role' => 'admin'];
            }
            foreach ($extraIds as $uid) {
                if (! isset($pu[$uid])) {
                    $pu[$uid] = ['role' => 'member'];
                }
            }
            $project->users()->sync($pu);
        }
    }

    /**
     * @return array<int>
     */
    private function extraMemberIdsFromProject(Project $project): array
    {
        $project->loadMissing('members');
        $ownerId = (int) $project->owner_id;
        $pmId = $project->project_manager_id ? (int) $project->project_manager_id : null;

        return $project->members
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->reject(fn (int $id) => $id === $ownerId || ($pmId !== null && $id === $pmId))
            ->values()
            ->all();
    }

    private function recalculateProjectCosts(Project $project): void
    {
        $rate = (float) ($project->cost_per_hour ?? 50);
        $estimatedHours = (float) $project->tasks()->sum('estimated_hours');
        $actualHours = (float) $project->tasks()->sum('actual_hours');

        $project->updateQuietly([
            'estimated_cost' => round($estimatedHours * $rate, 2),
            'actual_cost' => round($actualHours * $rate, 2),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mergedProjectMembers(Project $project): array
    {
        $project->load(['members', 'users']);

        $merged = [];

        foreach ($project->users as $u) {
            $merged[$u->id] = [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar,
                'role' => AccessControl::normalizePivotRole($u->pivot->role ?? 'member'),
            ];
        }

        foreach ($project->members as $u) {
            if (isset($merged[$u->id])) {
                continue;
            }
            $merged[$u->id] = [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar,
                'role' => AccessControl::normalizePivotRole($u->pivot->project_role ?? 'member'),
            ];
        }

        return array_values($merged);
    }
}
