<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\AIService;
use App\Services\NotificationService;
use App\Services\ProjectInviteService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AIService $aiService,
        private readonly ProjectInviteService $projectInviteService,
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with(['owner', 'team', 'chef'])
            ->withCount('members', 'tasks')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->team_id, fn ($q, $t) => $q->where('team_id', $t))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%");
            }))
            ->orderByDesc('updated_at');

        // Non-admin : uniquement propriétaire ou membre project_user.
        if (! AccessControl::isAdmin($user)) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('users', fn ($q2) => $q2->where('users.id', $user->id));
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
            'chef_id' => 'nullable|exists:users,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        // Normalize: chef_id is canonical, project_manager_id kept in sync
        $chefId = $data['chef_id'] ?? $data['project_manager_id'] ?? null;
        $data['chef_id'] = $chefId;
        $data['project_manager_id'] = $chefId;

        $membersPayload = $data['members'] ?? [];
        unset($data['members']);

        $this->assertNoApplicationAdmins([$chefId], 'chef_id');
        $this->assertNoApplicationAdmins($membersPayload, 'members');

        $data['owner_id'] = $request->user()->id;
        $data['created_by'] = $request->user()->id;

        $project = Project::create($data);

        $this->syncProjectMemberships($project, $membersPayload);

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

        $project->load('owner', 'members', 'statuses', 'client', 'manager');

        $this->activityLogService->log($project, $request->user(), 'project.created', $project, [
            'project_name' => $project->name,
            'project_code' => $project->code,
        ]);

        return response()->json([
            'message' => 'Projet créé avec succès.',
            'project' => new ProjectResource($project),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $project->load('owner', 'team', 'members', 'statuses', 'client', 'chef')
            ->loadCount('members', 'tasks');

        return response()->json(['project' => new ProjectResource($project)]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:10|unique:projects,code,'.$project->id,
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'client_id' => 'nullable|exists:clients,id',
            'chef_id' => 'sometimes|nullable|exists:users,id',
            'project_manager_id' => 'sometimes|nullable|exists:users,id',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'owner_id' => 'sometimes|exists:users,id',
        ]);

        $shouldSyncMembers = $request->hasAny(['chef_id', 'project_manager_id', 'members']);
        $membersPayload = $data['members'] ?? null;
        unset($data['members']);

        // Normalize chef_id ↔ project_manager_id
        if (isset($data['chef_id']) || isset($data['project_manager_id'])) {
            $newChefId = $data['chef_id'] ?? $data['project_manager_id'];
            if ($newChefId) {
                $this->assertNoApplicationAdmins([(int) $newChefId], 'chef_id');
                $data['chef_id'] = $newChefId;
                $data['project_manager_id'] = $newChefId;
            }
        }

        if ($membersPayload !== null) {
            $this->assertNoApplicationAdmins($membersPayload, 'members');
        }

        $project->update($data);
        $project->refresh();

        if ($shouldSyncMembers) {
            $extraMembers = $membersPayload !== null
                ? $membersPayload
                : $this->extraMemberIdsFromProject($project);
            $this->syncProjectMemberships($project, $extraMembers);
        }

        $project->load('owner', 'team', 'members', 'statuses', 'client', 'manager');

        $this->activityLogService->log($project, $request->user(), 'project.updated', $project, [
            'project_name' => $project->name,
        ]);

        return response()->json([
            'message' => 'Projet mis à jour.',
            'project' => new ProjectResource($project),
        ]);
    }

    public function changeChef(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $newChefId = (int) $data['user_id'];

        if ($newChefId === (int) $project->chef_id) {
            return response()->json(['message' => 'Cet utilisateur est déjà chef de projet.'], 422);
        }

        $this->assertNoApplicationAdmins([$newChefId], 'user_id');

        DB::transaction(function () use ($project, $newChefId, $request) {
            $project->update([
                'chef_id'            => $newChefId,
                'project_manager_id' => $newChefId,
            ]);
            $project->refresh();

            // Ensure new chef is a member, then re-sync all memberships
            $this->syncProjectMemberships($project, $this->extraMemberIdsFromProject($project));

            $this->activityLogService->log($project, $request->user(), 'project.chef_changed', $project, [
                'new_chef_id' => $newChefId,
            ]);
        });

        $project->refresh()->load('owner', 'team', 'members', 'statuses', 'client', 'chef');

        return response()->json([
            'message' => 'Chef de projet mis à jour.',
            'project' => new ProjectResource($project),
            'members' => $this->mergedProjectMembers($project),
        ]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('delete', $project);

        $this->activityLogService->log($project, $request->user(), 'project.deleted', $project, [
            'project_name' => $project->name,
        ]);

        $project->delete();

        return response()->json(['message' => 'Projet supprimé.']);
    }

    public function dashboard(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $cacheKey = 'project_dashboard_' . $project->id;
        $data = Cache::remember($cacheKey, 60, function () use ($project) {
            // Agrégats SQL — évite de charger toutes les tâches en mémoire
            $baseQuery = $project->tasks()->whereNull('deleted_at');
            $totalTasks     = (clone $baseQuery)->count();
            $completedTasks = (clone $baseQuery)->where('progress_percent', 100)->count();
            $overdueTasks   = (clone $baseQuery)
                ->where('progress_percent', '<', 100)
                ->where(fn ($q) => $q
                    ->where(fn ($q2) => $q2->whereNotNull('planned_end')->whereDate('planned_end', '<', now()))
                    ->orWhere(fn ($q2) => $q2->whereNull('planned_end')->whereNotNull('due_date')->whereDate('due_date', '<', now()))
                )
                ->count();
            $avgProgress = $totalTasks > 0 ? round(100 * $completedTasks / $totalTasks, 1) : 0;

            $ai       = app(AIService::class)->projectDashboardInsights($project);
            $statuses = $project->statuses;

            $tasksByStatus = $statuses->map(fn ($s) => [
                'status' => $s->name,
                'color'  => $s->color,
                'count'  => (clone $baseQuery)->where('status_id', $s->id)->count(),
            ]);

            $tasksByPriority = collect(['urgent', 'high', 'medium', 'low'])->map(fn ($p) => [
                'priority' => $p,
                'count'    => (clone $baseQuery)->where('priority', $p)->count(),
            ]);

            return [
                'total_tasks'            => $totalTasks,
                'completed_tasks'        => $completedTasks,
                'overdue_tasks'          => $overdueTasks,
                'avg_progress'           => $avgProgress,
                'total_estimated_hours'  => $ai['estimated_hours_total'],
                'total_actual_hours'     => $ai['actual_hours_total'],
                'ai_tasks_at_risk'       => $ai['ai_tasks_at_risk'],
                'workload_by_member'     => $ai['workload_by_member'],
                'estimated_vs_actual'    => [
                    'estimated' => $ai['estimated_hours_total'],
                    'actual'    => $ai['actual_hours_total'],
                    'delta'     => round($ai['estimated_hours_total'] - $ai['actual_hours_total'], 1),
                ],
                'tasks_by_status'   => $tasksByStatus,
                'tasks_by_priority' => $tasksByPriority,
            ];
        });

        return response()->json($data);
    }

    /** Invalide le cache dashboard d'un projet (appeler après toute mutation de tâche). */
    public static function forgetDashboardCache(int $projectId): void
    {
        Cache::forget('project_dashboard_' . $projectId);
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

    /**
     * Export CSV des tâches du projet (rapport simple).
     */
    public function exportTasks(Request $request, Project $project): StreamedResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->with(['status', 'assignees'])
            ->orderBy('id')
            ->get();

        $safeCode = preg_replace('/[^A-Za-z0-9_-]+/', '-', $project->code) ?: 'projet';
        $filename = $safeCode.'-taches.csv';

        return response()->streamDownload(function () use ($tasks) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, [
                'ID', 'Titre', 'Type', 'Priorité', 'Colonne Kanban', 'Workflow', 'Progression %',
                'Échéance', 'Assignés', 'Heures estimées',
            ], ';');

            foreach ($tasks as $t) {
                fputcsv($out, [
                    $t->id,
                    $t->title,
                    $t->issue_type,
                    $t->priority,
                    $t->status?->name,
                    $t->workflow_status,
                    $t->progress_percent,
                    $t->due_date?->toDateString(),
                    $t->assignees->pluck('name')->implode(', '),
                    $t->estimated_hours,
                ], ';');
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function members(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json([
            'members' => $this->mergedProjectMembers($project),
        ]);
    }

    /**
     * Recherche d'utilisateurs par nom ou e-mail pour ajout au projet (hors membres actuels).
     */
    public function searchUsers(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $search = $request->input('search', '');
        $search = is_string($search) ? trim($search) : '';

        $excludeIds = collect([$project->owner_id])
            ->merge($project->members()->pluck('users.id'))
            ->merge($project->users()->pluck('users.id'))
            ->filter(fn ($id) => $id !== null)
            ->unique()
            ->values()
            ->all();

        $query = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->orderBy('name')
            ->limit(50);

        if (mb_strlen($search) >= 2) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        if ($excludeIds !== []) {
            $query->whereNotIn('id', $excludeIds);
        }

        $users = $query->with('specialties:id,name,color')->get(['id', 'name', 'email', 'avatar']);

        $users->each(function ($user) {
            $user->setRelation('specialties', $user->specialties->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'color' => $s->color,
            ]));
        });

        return response()->json(['users' => $users]);
    }

    public function addMember(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $userId = (int) $data['user_id'];
        $this->assertNoApplicationAdmins([$userId], 'user_id');

        // All added members get role = 'member'; chef identity is in projects.chef_id
        if (Schema::hasTable('project_user')) {
            $project->users()->syncWithoutDetaching([$userId => ['role' => 'member']]);
        }
        if (Schema::hasTable('project_members')) {
            $project->members()->syncWithoutDetaching([$userId => ['project_role' => 'member']]);
        }

        $member = User::query()->find($userId);
        if ($member) {
            $this->activityLogService->log($project, $request->user(), 'project.member_added', $project, [
                'member_id'   => $member->id,
                'member_name' => $member->name,
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

        $project->members()->detach($userId);
        if (\Illuminate\Support\Facades\Schema::hasTable('project_user')) {
            $project->users()->detach($userId);
        }

        $this->activityLogService->log($project, $request->user(), 'project.member_removed', $project, [
            'member_id' => $userId,
        ]);

        return response()->json(['message' => 'Membre retiré du projet.']);
    }

    /**
     * Invitation par e-mail (membre ou invité lecture seule).
     * Jeton UUID, expiration 48 h, acceptation via /accept-invite (lien unique).
     */
    public function invite(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        if (! AccessControl::canInviteToProject($request->user(), $project)) {
            return response()->json(['message' => 'Seuls les administrateurs du projet peuvent inviter des membres.'], 403);
        }

        $data = $request->validate([
            'email' => 'required|email|max:255',
            'role' => 'required|string|in:member,client',
        ]);

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

        $this->activityLogService->log($project, $request->user(), 'project.user_invited', $pending, [
            'email' => $pending->email,
            'role' => $pending->role,
        ]);

        return response()->json([
            'message' => 'Invitation créée. Partagez le lien ci-dessous (valide 48 h).',
            'user_attached' => false,
            'invitation' => [
                'id' => $pending->id,
                'email' => $pending->email,
                'role' => $pending->role,
                'expires_at' => $pending->expires_at?->toIso8601String(),
                'token' => $pending->token,
            ],
            'invitation_path' => '/accept-invite?token='.urlencode($pending->token),
        ], 201);
    }

    /**
     * Sync project membership: chef + owner + extra members.
     * All pivot entries use role = 'member' — chef identity lives in projects.chef_id only.
     *
     * @param  array<int>  $extraMemberIds
     */
    private function syncProjectMemberships(Project $project, array $extraMemberIds): void
    {
        $chefId  = $project->chef_id  ? (int) $project->chef_id  : null;
        $ownerId = $project->owner_id ? (int) $project->owner_id : null;

        $allIds = collect($extraMemberIds)
            ->map(fn ($id) => (int) $id)
            ->when($chefId, fn ($c) => $c->push($chefId))
            ->unique()
            ->filter(fn ($id) => $id > 0)
            ->values();

        // project_user: simple membership, role always = 'member'
        if (Schema::hasTable('project_user')) {
            $pu = $allIds->mapWithKeys(fn ($id) => [$id => ['role' => 'member']])->all();
            $project->users()->sync($pu);
        }

        // project_members: legacy table — owner gets 'owner', chef gets 'admin', others 'member'
        if (Schema::hasTable('project_members')) {
            $pm = [];
            foreach ($allIds as $id) {
                if ($id === $ownerId) {
                    $pm[$id] = ['project_role' => 'owner'];
                } elseif ($id === $chefId) {
                    $pm[$id] = ['project_role' => 'admin'];
                } else {
                    $pm[$id] = ['project_role' => 'member'];
                }
            }
            $project->members()->sync($pm);
        }
    }

    /**
     * @return array<int>
     */
    private function extraMemberIdsFromProject(Project $project): array
    {
        $project->loadMissing('users', 'members');
        $ownerId = (int) $project->owner_id;
        $chefId  = $project->chef_id ? (int) $project->chef_id : null;

        $fromUsers = $project->users->pluck('id')->map(fn ($id) => (int) $id);
        $fromLegacy = $project->members->pluck('id')->map(fn ($id) => (int) $id);

        return $fromUsers->merge($fromLegacy)
            ->unique()
            ->reject(fn (int $id) => $id === $ownerId || ($chefId !== null && $id === $chefId))
            ->values()
            ->all();
    }

    /**
     * @param  array<int, mixed>  $userIds
     */
    private function assertNoApplicationAdmins(array $userIds, string $field): void
    {
        $ids = collect($userIds)
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return;
        }

        $hasAdmin = User::query()
            ->whereIn('id', $ids->all())
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->exists();

        if ($hasAdmin) {
            throw ValidationException::withMessages([
                $field => ['Les utilisateurs avec le role admin ne peuvent pas participer aux projets.'],
            ]);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mergedProjectMembers(Project $project): array
    {
        $project->load(['members.specialties', 'users.specialties']);

        // Fall back to project_manager_id so the member list stays in sync with the form
        // even before the chef_id migration has been run.
        $chefId  = $project->chef_id
            ? (int) $project->chef_id
            : ($project->project_manager_id ? (int) $project->project_manager_id : null);
        $ownerId = $project->owner_id ? (int) $project->owner_id : null;
        $merged  = [];

        $buildEntry = function ($u) use ($chefId, $ownerId): array {
            $uid    = (int) $u->id;
            $isChef = $chefId !== null && $uid === $chefId;
            return [
                'id'          => $u->id,
                'name'        => $u->name,
                'email'       => $u->email,
                'avatar'      => $u->avatar,
                'is_chef'     => $isChef,
                'is_owner'    => $ownerId !== null && $uid === $ownerId,
                'role'        => $isChef ? 'chef' : 'membre',
                'specialties' => $u->specialties->map(fn ($s) => [
                    'id'    => $s->id,
                    'name'  => $s->name,
                    'color' => $s->color,
                ])->values()->all(),
            ];
        };

        foreach ($project->users as $u) {
            $merged[$u->id] = $buildEntry($u);
        }

        foreach ($project->members as $u) {
            if (isset($merged[$u->id])) {
                continue;
            }
            $merged[$u->id] = $buildEntry($u);
        }

        return array_values($merged);
    }
}
