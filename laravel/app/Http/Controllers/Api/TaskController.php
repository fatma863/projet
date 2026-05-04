<?php

namespace App\Http\Controllers\Api;

use App\Events\TaskCommentCreated;
use App\Events\TaskCommentDeleted;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Resources\AttachmentResource;
use App\Http\Resources\CommentResource;
use App\Http\Resources\TaskAssigneeResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TimeEntryResource;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskComment;
use App\Models\TimeEntry;
use App\Models\Sprint;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\ActivityService;
use App\Services\AIService;
use App\Services\SprintService;
use App\Services\MemberDashboardService;
use App\Services\MentionService;
use App\Services\NotificationService;
use App\Support\AccessControl;
use App\Support\ApiPagination;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
        private readonly MentionService $mentionService,
        private readonly NotificationService $notificationService,
        private readonly AIService $aiService,
        private readonly ActivityService $activityService,
        private readonly SprintService $sprintService,
    ) {}

    // ─── CRUD ────────────────────────────────────────────

    public function globalIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Task::query()
            ->accessibleBy($user)
            ->select(Task::API_INDEX_COLUMNS)
            ->with([
                'status' => fn ($q) => $q->select('id', 'project_id', 'name', 'color', 'order', 'is_default'),
                'creator' => fn ($q) => $q->select('id', 'name', 'email'),
                'assignees' => fn ($q) => $q->select('users.id', 'users.name', 'users.email'),
                'project' => fn ($q) => $q->select('id', 'name', 'code', 'owner_id'),
                'sprint' => fn ($q) => $q->select(
                    'id', 'project_id', 'name', 'goal', 'status', 'start_date', 'end_date',
                    'started_at', 'ended_at', 'created_at', 'updated_at'
                ),
            ]);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('workflow_status')) {
            $query->where('workflow_status', $request->string('workflow_status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->string('priority'));
        }
        if ($request->filled('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->integer('assignee_id')));
        }
        if ($request->filled('issue_type')) {
            $query->where('issue_type', $request->string('issue_type'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $this->applyDueDateRangeFilters($request, $query);
        if ($request->filled('planned_end_before')) {
            $query->whereDate('planned_end', '<=', $request->date('planned_end_before'));
        }
        if ($request->filled('planned_end_after')) {
            $query->whereDate('planned_end', '>=', $request->date('planned_end_after'));
        }

        $perPage = ApiPagination::perPage($request);
        if ($request->boolean('all')) {
            $total = (clone $query)->count();
            // Limite à 500 pour éviter des payloads trop lourds (utiliser la pagination sinon)
            $tasks = $query->orderByDesc('updated_at')->limit(500)->get();

            return response()->json([
                'tasks' => TaskResource::collection($tasks),
                'meta' => [
                    'total' => $total,
                    'returned' => $tasks->count(),
                ],
            ]);
        }

        $tasks = $query->orderByDesc('updated_at')->paginate($perPage);

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $query = $project->tasks()
            ->select(Task::API_INDEX_COLUMNS)
            ->with([
                'project' => fn ($q) => $q->select('id', 'name', 'code', 'owner_id'),
                'status' => fn ($q) => $q->select('id', 'project_id', 'name', 'color', 'order', 'is_default'),
                'creator' => fn ($q) => $q->select('id', 'name', 'email'),
                'assignees' => fn ($q) => $q->select('users.id', 'users.name', 'users.email'),
                'parent' => fn ($q) => $q->select(Task::API_INDEX_COLUMNS),
                'sprint' => fn ($q) => $q->select(
                    'id', 'project_id', 'name', 'goal', 'status', 'start_date', 'end_date',
                    'started_at', 'ended_at', 'created_at', 'updated_at'
                ),
            ]);

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->assignee_id));
        }
        if ($request->filled('issue_type')) {
            $query->where('issue_type', $request->string('issue_type'));
        }
        if ($request->filled('workflow_status')) {
            $query->where('workflow_status', $request->string('workflow_status'));
        }
        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }
        if ($request->boolean('backlog')) {
            $query->whereNull('sprint_id');
        }
        if ($request->filled('sprint_id')) {
            $query->where('sprint_id', $request->sprint_id);
        }
        if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $this->applyDueDateRangeFilters($request, $query);
        if ($request->filled('planned_end_before')) {
            $query->whereDate('planned_end', '<=', $request->date('planned_end_before'));
        }
        if ($request->filled('planned_end_after')) {
            $query->whereDate('planned_end', '>=', $request->date('planned_end_after'));
        }

        $sortField = $request->input('sort', 'kanban_order');
        $sortDir = $request->input('direction', 'asc');
        $query->orderBy($sortField, $sortDir);

        $perPage = ApiPagination::perPage($request);

        // Cache the full unfiltered list (all=1) for 90 s — busted on any task mutation.
        if ($request->boolean('all') && !$request->hasAny(['search', 'status_id', 'priority', 'assignee_id', 'workflow_status'])) {
            $cacheKey = "project_tasks_all_{$project->id}";
            $tasks = Cache::remember($cacheKey, 90, fn () => $query->limit(200)->get());
        } else {
            $tasks = $request->boolean('all')
                ? $query->limit(200)->get()
                : $query->paginate($perPage);
        }

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'meta' => $request->boolean('all') ? null : [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $this->authorizeProjectWrite($request->user(), $project);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'issue_type' => 'required|in:task,bug,story',
            'status_id' => [
                'nullable',
                Rule::exists('task_statuses', 'id')->where('project_id', $project->id),
            ],
            'priority' => 'required|in:low,medium,high,urgent',
            'complexity' => 'nullable|integer|min:1|max:10',
            'story_points' => 'nullable|integer|min:0|max:1000',
            'planned_start' => 'nullable|date',
            'planned_end' => 'nullable|date|after_or_equal:planned_start',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_duration' => 'nullable|integer|min:0',
            'duration_days' => 'nullable|integer|min:1|max:3650',
            'workflow_status' => 'sometimes|in:todo,in_progress,done,at_risk',
            'parent_id' => 'nullable|exists:tasks,id',
            'sprint_id' => [
                'nullable',
                Rule::exists('sprints', 'id')->where('project_id', $project->id),
            ],
            'ai_auto_assign' => 'sometimes|boolean',
            'assignee_id' => 'nullable|exists:users,id',
            'depends_on_task_ids' => 'nullable|array|max:100',
            'depends_on_task_ids.*' => [
                'integer',
                Rule::exists('tasks', 'id')->where('project_id', $project->id),
            ],
            'specialty_ids'   => 'required|array|size:1',
            'specialty_ids.*' => 'integer|exists:specialties,id',
        ]);

        $this->assertTaskDatesWithinProjectWindow($project, $data);

        $specialtyIds = array_values(array_unique($data['specialty_ids'] ?? []));
        unset($data['specialty_ids']);

        $dependencyIds = array_values(array_unique(array_filter($data['depends_on_task_ids'] ?? [])));
        unset($data['depends_on_task_ids']);

        $assigneeId = $data['assignee_id'] ?? null;
        unset($data['assignee_id']);

        if ($assigneeId) {
            $this->assertAssigneeIsNotApplicationAdmin((int) $assigneeId, 'assignee_id');
        }

        if (! empty($data['sprint_id'])) {
            $sprint = Sprint::query()->where('id', $data['sprint_id'])->where('project_id', $project->id)->firstOrFail();
            $this->sprintService->assertSprintAcceptsTaskAssignment($project, $sprint);
        } else {
            $maxPos = (int) ($project->tasks()->whereNull('sprint_id')->max('position') ?? -1);
            $data['position'] = $maxPos + 1;
        }

        $data['status_id'] = $data['status_id'] ?? $project->resolveStatusIdForWorkflow('todo');
        if (empty($data['status_id'])) {
            return response()->json([
                'message' => 'Ajoutez au moins une colonne Kanban (statut de tâche) à ce projet avant de créer des tâches.',
            ], 422);
        }

        $maxOrder = $project->tasks()
            ->where('status_id', $data['status_id'])
            ->max('kanban_order') ?? -1;

        $data['created_by'] = Auth::id();
        $data['kanban_order'] = $maxOrder + 1;

        if (! empty($data['planned_end'])) {
            $data['due_date'] = $data['planned_end'];
        }

        $task = $project->tasks()->create($data);
        if (! isset($data['workflow_status'])) {
            $task->refreshWorkflowStatus();
        }

        $this->syncTaskDependencies($task, $dependencyIds);

        $task->specialties()->sync($specialtyIds);

        $this->aiService->applyOnTaskCreate($task, $request->boolean('ai_auto_assign'));
        $task->refresh();

        if ($assigneeId) {
            $this->syncPrimaryAssignee($task, (int) $assigneeId);
            $task->load('assignees');
            $assignee = $task->assignees->first();
            if ($assignee && $assignee->id !== Auth::id()) {
                $this->notificationService->notifyTaskAssigned($task, $assignee, Auth::user());
            }
            if ($assignee) {
                $this->notificationService->notifyOverloadIfNeeded($assignee);
            }
        }

        $task->load(['status', 'creator', 'assignees', 'dependencies']);

        $this->activityLogService->log($project, Auth::user(), 'task.created', $task, [
            'task_title' => $task->title,
            'status_id' => $task->status_id,
        ]);
        $this->activityService->recordCreatedTask(Auth::user(), $task);
        if ($assigneeId) {
            $this->activityService->recordAssignedTask(Auth::user(), $task, (int) $assigneeId);
        } else {
            $task->refresh();
            $autoAssignee = $task->assignees()->first();
            if ($autoAssignee) {
                $this->activityService->recordAssignedTask(Auth::user(), $task, (int) $autoAssignee->id);
            }
        }
        $this->invalidateMemberDashboardCaches($task->fresh());
        self::forgetProjectTasksCache($project->id);

        return response()->json([
            'message' => 'Tâche créée.',
            'task' => new TaskResource($task),
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $task->load([
            'status', 'creator', 'updater', 'parent', 'subtasks.status',
            'assignees', 'assignments.user', 'dependencies.status',
            'dependents.status', 'attachments.user',
            'timeEntries.user', 'specialties',
        ]);

        return response()->json(['task' => new TaskResource($task)]);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $hasWorkflow = $request->has('workflow_status');

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'issue_type' => 'sometimes|in:task,bug,story',
            'status_id' => ['sometimes', Rule::exists('task_statuses', 'id')->where('project_id', $task->project_id)],
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'complexity' => 'nullable|integer|min:1|max:10',
            'story_points' => 'nullable|integer|min:0|max:1000',
            'planned_start' => 'nullable|date',
            'planned_end' => 'nullable|date|after_or_equal:planned_start',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_duration' => 'nullable|integer|min:0',
            'duration_days' => 'nullable|integer|min:1|max:3650',
            'actual_hours' => 'nullable|numeric|min:0',
            'progress_percent' => 'nullable|integer|min:0|max:100',
            'workflow_status' => 'sometimes|in:todo,in_progress,done,at_risk',
            'parent_id' => 'nullable|exists:tasks,id',
            'sprint_id' => [
                'nullable',
                Rule::exists('sprints', 'id')->where('project_id', $task->project_id),
            ],
            'assignee_id' => 'sometimes|nullable|exists:users,id',
            'depends_on_task_ids' => 'sometimes|nullable|array|max:100',
            'depends_on_task_ids.*' => [
                'integer',
                Rule::exists('tasks', 'id')->where('project_id', $task->project_id),
            ],
            'specialty_ids'   => 'sometimes|required|array|size:1',
            'specialty_ids.*' => 'integer|exists:specialties,id',
        ]);

        $this->assertPlannedStartImmutable($task, $data);
        $this->assertTaskDatesWithinProjectWindow($task->project, $data, $task);

        $syncSpecialties = array_key_exists('specialty_ids', $data);
        $specialtyIdsUpdate = array_values(array_unique($data['specialty_ids'] ?? []));
        unset($data['specialty_ids']);

        $syncAssignee = array_key_exists('assignee_id', $data);
        $assigneeIdUpdate = $data['assignee_id'] ?? null;
        unset($data['assignee_id']);

        if ($syncAssignee && $assigneeIdUpdate) {
            $this->assertAssigneeIsNotApplicationAdmin((int) $assigneeIdUpdate, 'assignee_id');
        }

        $syncDependencies = array_key_exists('depends_on_task_ids', $data);
        $dependencyIdsUpdate = array_values(array_unique(array_filter($data['depends_on_task_ids'] ?? [])));
        unset($data['depends_on_task_ids']);

        $this->sprintService->assertTaskEditableWhenSprintFrozen($task, $data);

        if (array_key_exists('sprint_id', $data) && $data['sprint_id'] !== null) {
            $sprint = Sprint::query()->where('id', $data['sprint_id'])->where('project_id', $task->project_id)->firstOrFail();
            $this->sprintService->assertSprintAcceptsTaskAssignment($task->project, $sprint);
        }

        if (array_key_exists('planned_end', $data)) {
            $data['due_date'] = $data['planned_end'];
        }

        $oldSprintId = $task->sprint_id;

        $data['updated_by'] = Auth::id();
        $task->update($data);

        if (array_key_exists('sprint_id', $data) && $data['sprint_id'] === null && $oldSprintId !== null) {
            $task->loadMissing('project');
            $maxPos = (int) ($task->project->tasks()->whereNull('sprint_id')->where('id', '!=', $task->id)->max('position') ?? -1);
            $task->update(['position' => $maxPos + 1]);
        }

        if (array_key_exists('workflow_status', $data)) {
            $task->load('project');
            $sid = $task->project->resolveStatusIdForWorkflow($data['workflow_status']);
            if ($sid) {
                $task->update(['status_id' => $sid]);
            }
        }

        if ($syncAssignee) {
            $task->loadMissing('assignees');
            $currentAssigneeId = $task->assignees->first()?->id;
            $wantAssigneeId = $assigneeIdUpdate ? (int) $assigneeIdUpdate : null;
            if ($currentAssigneeId !== $wantAssigneeId) {
                $this->syncPrimaryAssignee($task->fresh(), $wantAssigneeId);
                $task->load('assignees');
                if ($wantAssigneeId) {
                    $assignee = User::find($wantAssigneeId);
                    if ($assignee && $assignee->id !== Auth::id()) {
                        $this->notificationService->notifyTaskAssigned($task->fresh(), $assignee, Auth::user());
                    }
                    if ($assignee) {
                        $this->notificationService->notifyOverloadIfNeeded($assignee);
                    }
                }
            }
        }

        if ($syncDependencies) {
            $this->syncTaskDependencies($task->fresh(), $dependencyIdsUpdate);
        }

        if ($syncSpecialties) {
            $task->specialties()->sync($specialtyIdsUpdate);
        }

        try {
            $this->aiService->refreshRiskAfterUpdate($task);
        } catch (\Throwable) {
            // Risk refresh is non-critical; don't fail the move
        }
        $task->refresh();
        if (! $hasWorkflow) {
            $task->refreshWorkflowStatus();
        }
        $task->load(['status', 'creator', 'assignees', 'dependencies']);

        $changed = [];
        $watch = ['title', 'description', 'priority', 'workflow_status', 'status_id', 'progress_percent', 'planned_start', 'planned_end', 'due_date', 'issue_type'];
        foreach ($watch as $k) {
            if ($request->has($k)) {
                $v = $task->{$k};
                $changed[$k] = $v instanceof \Carbon\CarbonInterface ? $v->toDateString() : $v;
            }
        }
        if ($syncAssignee) {
            $changed['assignee_id'] = $assigneeIdUpdate ? (int) $assigneeIdUpdate : null;
        }

        $this->activityLogService->log($task->project, Auth::user(), 'task.updated', $task, [
            'status_id' => $task->status_id,
            'progress_percent' => $task->progress_percent,
            'task_title' => $task->title,
            'changed' => $changed,
        ]);
        $this->notifyDelayIfNeeded($task);
        ProjectController::forgetDashboardCache($task->project_id);
        self::forgetProjectTasksCache($task->project_id);

        return response()->json([
            'message' => 'Tâche mise à jour.',
            'task' => new TaskResource($task),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);
        $this->invalidateMemberDashboardCaches($task);
        $project = $task->project;
        $title = $task->title;
        self::forgetProjectTasksCache($project->id);
        $task->delete();
        $this->activityLogService->log($project, Auth::user(), 'task.deleted', $task, [
            'task_title' => $title,
        ]);
        ProjectController::forgetDashboardCache($project->id);

        return response()->json(['message' => 'Tâche supprimée.']);
    }

    // ─── KANBAN MOVE ────────────────────────────────────

    public function move(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'status_id' => 'required|exists:task_statuses,id',
            'kanban_order' => 'required|integer|min:0',
        ]);

        // Re-order other tasks in the target column
        Task::where('project_id', $task->project_id)
            ->where('status_id', $data['status_id'])
            ->where('kanban_order', '>=', $data['kanban_order'])
            ->increment('kanban_order');

        $task->update([
            'status_id' => $data['status_id'],
            'kanban_order' => $data['kanban_order'],
            'updated_by' => Auth::id(),
        ]);
        $this->activityLogService->log($task->project, Auth::user(), 'task.moved', $task, [
            'status_id' => $task->status_id,
            'kanban_order' => $task->kanban_order,
        ]);
        $this->activityService->recordUpdatedTask(Auth::user(), $task, [
            'status_id' => $task->status_id,
            'kanban_move' => true,
        ]);
        $this->invalidateMemberDashboardCaches($task);
        $this->notifyDelayIfNeeded($task);
        self::forgetProjectTasksCache($task->project_id);
        try {
            $this->aiService->refreshRiskAfterUpdate($task);
        } catch (\Throwable) {
            // Risk refresh is non-critical; don't fail the move
        }
        $moved = $task->fresh();
        if ($moved) {
            $moved->refreshWorkflowStatus();
        }

        return response()->json([
            'message' => 'Tâche déplacée.',
            'task' => new TaskResource($task->fresh(['status', 'assignees', 'project'])),
        ]);
    }

    // ─── ASSIGNEES ──────────────────────────────────────

    public function assignees(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $task->load('assignees');

        return response()->json([
            'assignees' => TaskAssigneeResource::collection($task->assignees),
        ]);
    }

    public function assign(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'allocation_percent' => 'sometimes|integer|min:1|max:100',
        ]);

        $this->assertAssigneeIsNotApplicationAdmin((int) $data['user_id'], 'user_id');

        $assignment = TaskAssignment::updateOrCreate(
            ['task_id' => $task->id, 'user_id' => $data['user_id']],
            [
                'allocation_percent' => $data['allocation_percent'] ?? 100,
                'assigned_at' => now(),
            ]
        );
        $this->activityLogService->log($task->project, Auth::user(), 'task.assigned', $task, [
            'assigned_user_id' => $data['user_id'],
            'allocation_percent' => $assignment->allocation_percent,
        ]);
        $this->activityService->recordAssignedTask(Auth::user(), $task, (int) $data['user_id']);
        $this->invalidateMemberDashboardCaches($task);
        $assignee = $assignment->user()->first();
        if ($assignee && $assignee->id !== Auth::id()) {
            $this->notificationService->notifyTaskAssigned($task, $assignee, Auth::user());
        }
        if ($assignee) {
            $this->notificationService->notifyOverloadIfNeeded($assignee);
        }

        try {
            $this->aiService->refreshRiskAfterUpdate($task);
        } catch (\Throwable) {
            // Risk refresh is non-critical
        }

        return response()->json([
            'message' => 'Assignation effectuée.',
            'assignment' => new TaskAssigneeResource($assignment->load('user')),
        ]);
    }

    public function unassign(Task $task, int $userId): JsonResponse
    {
        Gate::authorize('update', $task);

        TaskAssignment::where('task_id', $task->id)
            ->where('user_id', $userId)
            ->delete();
        $this->activityLogService->log($task->project, Auth::user(), 'task.unassigned', $task, [
            'unassigned_user_id' => $userId,
        ]);
        $this->invalidateMemberDashboardCaches($task, [$userId]);

        try {
            $this->aiService->refreshRiskAfterUpdate($task);
        } catch (\Throwable) {
            // Risk refresh is non-critical
        }

        return response()->json(['message' => 'Désassignation effectuée.']);
    }

    // ─── DEPENDENCIES ───────────────────────────────────

    public function dependencies(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $task->load(['dependencies', 'dependents']);

        return response()->json([
            'dependencies' => $task->dependencies->map(fn ($dep) => [
                'id' => $dep->id,
                'title' => $dep->title,
                'type' => $dep->pivot->type,
            ]),
            'dependents' => $task->dependents->map(fn ($dep) => [
                'id' => $dep->id,
                'title' => $dep->title,
                'type' => $dep->pivot->type,
            ]),
        ]);
    }

    public function addDependency(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'depends_on_task_id' => 'required|exists:tasks,id',
            'type' => 'sometimes|in:FS,SS,FF,SF',
        ]);

        if ($data['depends_on_task_id'] == $task->id) {
            return response()->json(['message' => 'Une tâche ne peut pas dépendre d\'elle-même.'], 422);
        }

        $task->dependencies()->syncWithoutDetaching([
            $data['depends_on_task_id'] => ['type' => $data['type'] ?? 'FS'],
        ]);
        $this->activityLogService->log($task->project, Auth::user(), 'task.dependency_added', $task, [
            'depends_on_task_id' => $data['depends_on_task_id'],
            'type' => $data['type'] ?? 'FS',
        ]);
        $this->forgetMemberDashboardForProject($task->project);

        return response()->json(['message' => 'Dépendance ajoutée.'], 201);
    }

    public function removeDependency(Task $task, int $dependencyId): JsonResponse
    {
        Gate::authorize('update', $task);
        $task->dependencies()->detach($dependencyId);
        $this->activityLogService->log($task->project, Auth::user(), 'task.dependency_removed', $task, [
            'depends_on_task_id' => $dependencyId,
        ]);

        return response()->json(['message' => 'Dépendance supprimée.']);
    }

    // ─── COMMENTS ───────────────────────────────────────

    public function comments(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $comments = $task->comments()
            ->whereNull('parent_id')
            ->with(['user', 'replies.user'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'comments' => CommentResource::collection($comments),
        ]);
    }

    public function addComment(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $this->authorizeProjectComment($request->user(), $task->project);

        $data = $request->validate([
            'body' => 'required|string|max:20000',
            'parent_id' => [
                'nullable',
                Rule::exists('task_comments', 'id')->where(function ($q) use ($task) {
                    $q->where('task_id', $task->id)->whereNull('parent_id');
                }),
            ],
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'body' => $data['body'],
            'parent_id' => $data['parent_id'] ?? null,
        ]);
        $comment->load('user', 'task');
        $this->activityLogService->log($task->project, Auth::user(), 'task.comment_added', $comment, [
            'task_id' => $task->id,
            'comment_preview' => mb_substr($comment->body, 0, 120),
            'parent_id' => $comment->parent_id,
        ]);
        $this->mentionService->notifyMentions($comment);
        $task->load('assignees');
        if (empty($data['parent_id'])) {
            foreach ($task->assignees as $assignee) {
                if ((int) $assignee->id === (int) Auth::id()) {
                    continue;
                }
                $this->notificationService->notifyTaskCommentAdded($task, $assignee, $comment->id, Auth::user());
            }
        } else {
            $parent = TaskComment::query()
                ->where('task_id', $task->id)
                ->whereNull('parent_id')
                ->whereKey($data['parent_id'])
                ->first();
            if ($parent && (int) $parent->user_id !== (int) Auth::id()) {
                $parentUser = User::find($parent->user_id);
                if ($parentUser) {
                    $this->notificationService->notifyTaskCommentAdded($task, $parentUser, $comment->id, Auth::user());
                }
            }
        }
        broadcast(new TaskCommentCreated($comment))->toOthers();
        $this->invalidateMemberDashboardCaches($task);

        return response()->json([
            'message' => 'Commentaire ajouté.',
            'comment' => new CommentResource($comment->load(['user', 'replies.user'])),
        ], 201);
    }

    public function deleteComment(Task $task, TaskComment $comment): JsonResponse
    {
        if ($comment->task_id !== $task->id) {
            abort(404);
        }
        if ($comment->user_id !== Auth::id() && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $comment->load('task');
        $event = TaskCommentDeleted::fromComment($comment);
        $this->activityLogService->log($task->project, Auth::user(), 'task.comment_deleted', $comment, [
            'task_id' => $task->id,
            'comment_id' => $comment->id,
        ]);
        $comment->delete();
        broadcast($event)->toOthers();

        return response()->json(['message' => 'Commentaire supprimé.']);
    }

    public function updateComment(Request $request, Task $task, TaskComment $comment): JsonResponse
    {
        if ($comment->task_id !== $task->id) {
            abort(404);
        }
        if ($comment->user_id !== Auth::id() && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }
        $this->authorizeProjectComment($request->user(), $task->project);

        $data = $request->validate([
            'body' => 'required|string|max:20000',
        ]);

        $comment->update([
            'body' => $data['body'],
            'edited_at' => now(),
        ]);
        $comment->load('user');

        return response()->json([
            'message' => 'Commentaire mis à jour.',
            'comment' => new CommentResource($comment->load(['user', 'replies.user'])),
        ]);
    }

    // ─── ATTACHMENTS ────────────────────────────────────

    public function attachments(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'attachments' => AttachmentResource::collection(
                $task->attachments()->with('user')->get()
            ),
        ]);
    }

    public function addAttachment(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $this->authorizeProjectWrite($request->user(), $task->project);

        $data = $request->validate([
            'type' => 'required|in:file,link',
            'file' => 'required_if:type,file|file|max:10240',
            'url' => 'required_if:type,link|nullable|url|max:2048',
            'filename' => 'required_if:type,link|nullable|string|max:255',
        ]);

        if ($data['type'] === 'file') {
            $file = $request->file('file');
            $path = $file->store("tasks/{$task->id}/attachments", 'local');

            $attachment = $task->attachments()->create([
                'user_id' => Auth::id(),
                'type' => 'file',
                'path_or_url' => $path,
                'filename' => $file->getClientOriginalName(),
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        } else {
            $attachment = $task->attachments()->create([
                'user_id' => Auth::id(),
                'type' => 'link',
                'path_or_url' => $data['url'],
                'filename' => $data['filename'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Pièce jointe ajoutée.',
            'attachment' => new AttachmentResource($attachment->load('user')),
        ], 201);
    }

    public function deleteAttachment(Task $task, Attachment $attachment): JsonResponse
    {
        if ($attachment->task_id !== $task->id) {
            abort(404);
        }
        if ($attachment->user_id !== Auth::id() && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }

        if ($attachment->type === 'file' && $attachment->path_or_url) {
            Storage::disk('local')->delete($attachment->path_or_url);
        }

        $attachment->delete();

        return response()->json(['message' => 'Pièce jointe supprimée.']);
    }

    public function downloadAttachment(Task $task, Attachment $attachment)
    {
        Gate::authorize('view', $task);

        if ($attachment->task_id !== $task->id || $attachment->type !== 'file') {
            abort(404);
        }

        $path = $attachment->path_or_url;
        if (! Storage::disk('local')->exists($path)) {
            abort(404);
        }

        return Storage::disk('local')->download($path, $attachment->filename ?: basename($path));
    }

    // ─── TIME ENTRIES ───────────────────────────────────

    public function timeEntries(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'time_entries' => TimeEntryResource::collection(
                $task->timeEntries()->with('user')->orderByDesc('date')->orderByDesc('id')->get()
            ),
        ]);
    }

    public function addTimeEntry(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $this->authorizeProjectWrite($request->user(), $task->project);

        $data = $request->validate([
            'source' => 'sometimes|in:manual,timer',
            'date' => 'required|date',
            'minutes' => 'required|integer|min:1',
            'note' => 'nullable|string|max:500',
        ]);

        $data['user_id'] = Auth::id();

        $entry = $task->timeEntries()->create($data);
        $this->activityLogService->log($task->project, Auth::user(), 'task.time_added', $entry, [
            'minutes' => $entry->minutes,
            'date' => $entry->date,
        ]);

        return response()->json([
            'message' => 'Entrée de temps ajoutée.',
            'time_entry' => new TimeEntryResource($entry->load('user')),
        ], 201);
    }

    public function deleteTimeEntry(Task $task, TimeEntry $timeEntry): JsonResponse
    {
        if ($timeEntry->task_id !== $task->id) {
            abort(404);
        }
        if ($timeEntry->user_id !== Auth::id() && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $this->activityLogService->log($task->project, Auth::user(), 'task.time_deleted', $timeEntry, [
            'time_entry_id' => $timeEntry->id,
        ]);
        $timeEntry->delete();

        return response()->json(['message' => 'Entrée de temps supprimée.']);
    }

    private function syncPrimaryAssignee(Task $task, ?int $assigneeId): void
    {
        TaskAssignment::where('task_id', $task->id)->delete();
        if ($assigneeId) {
            $this->assertAssigneeIsNotApplicationAdmin($assigneeId, 'assignee_id');
            TaskAssignment::create([
                'task_id' => $task->id,
                'user_id' => $assigneeId,
                'allocation_percent' => 100,
                'assigned_at' => now(),
            ]);
        }
    }

    /**
     * @param  array<int, int>  $dependsOnTaskIds  Task IDs this task depends on (predecessors).
     */
    private function syncTaskDependencies(Task $task, array $dependsOnTaskIds): void
    {
        $taskId = $task->id;
        $filtered = collect($dependsOnTaskIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0 && $id !== $taskId)
            ->unique()
            ->values()
            ->all();

        $sync = [];
        foreach ($filtered as $depId) {
            $sync[$depId] = ['type' => 'FS'];
        }

        $task->dependencies()->sync($sync);
    }

    private function assertPlannedStartImmutable(Task $task, array $data): void
    {
        if (! array_key_exists('planned_start', $data)) {
            return;
        }

        $requested = $data['planned_start']
            ? Carbon::parse((string) $data['planned_start'])->toDateString()
            : null;
        $current = $task->planned_start?->toDateString();

        if ($requested !== $current) {
            throw ValidationException::withMessages([
                'planned_start' => ['La date de début ne peut pas être modifiée après création de la tâche.'],
            ]);
        }
    }

    private function assertTaskDatesWithinProjectWindow(Project $project, array $data, ?Task $existingTask = null): void
    {
        $projectStart = $project->start_date?->copy()->startOfDay();
        $projectEnd = $project->end_date?->copy()->startOfDay();

        if (! $projectStart && ! $projectEnd) {
            return;
        }

        // Ne valider que les dates explicitement fournies dans la requête.
        // Lorsqu'on fait un update partiel (ex: workflow_status uniquement),
        // les dates existantes ne doivent pas être re-validées.
        $updatingStart = array_key_exists('planned_start', $data);
        $updatingEnd   = array_key_exists('planned_end', $data);

        if (! $updatingStart && ! $updatingEnd) {
            return;
        }

        $plannedStartRaw = $updatingStart ? $data['planned_start'] : null;
        $plannedEndRaw   = $updatingEnd   ? $data['planned_end']   : null;

        $plannedStart = $plannedStartRaw ? Carbon::parse((string) $plannedStartRaw)->startOfDay() : null;
        $plannedEnd = $plannedEndRaw ? Carbon::parse((string) $plannedEndRaw)->startOfDay() : null;

        $errors = [];

        if ($plannedStart && $plannedEnd && $plannedEnd->lt($plannedStart)) {
            $errors['planned_end'] = ['La date de fin doit être postérieure ou égale à la date de début.'];
        }

        if ($plannedStart && $projectStart && $plannedStart->lt($projectStart)) {
            $errors['planned_start'] = ["La date de début doit être >= à la date de début du projet ({$projectStart->toDateString()})."];
        }
        if ($plannedStart && $projectEnd && $plannedStart->gt($projectEnd)) {
            $errors['planned_start'] = ["La date de début doit être <= à la date de fin du projet ({$projectEnd->toDateString()})."];
        }

        if ($plannedEnd && $projectStart && $plannedEnd->lt($projectStart)) {
            $errors['planned_end'] = ["La date de fin doit être >= à la date de début du projet ({$projectStart->toDateString()})."];
        }
        if ($plannedEnd && $projectEnd && $plannedEnd->gt($projectEnd)) {
            $errors['planned_end'] = ["La date de fin doit être <= à la date de fin du projet ({$projectEnd->toDateString()})."];
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function assertAssigneeIsNotApplicationAdmin(int $userId, string $field): void
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return;
        }

        if ($user->hasRole('admin')) {
            throw ValidationException::withMessages([
                $field => ['Les utilisateurs avec le role admin ne peuvent pas etre assignes aux taches.'],
            ]);
        }
    }

    private function notifyDelayIfNeeded(Task $task): void
    {
        if ($this->notificationService->taskIsDelayed($task)) {
            $this->notificationService->notifyTaskDelayed($task, Auth::user());
        }
    }

    private function authorizeProjectWrite($user, Project $project): void
    {
        if (! AccessControl::canCreateTaskInProject($user, $project)) {
            abort(403, 'Accès en écriture refusé.');
        }
    }

    private function authorizeProjectComment($user, Project $project): void
    {
        if (! AccessControl::canCommentOnProject($user, $project)) {
            abort(403, 'Commentaire non autorisé pour ce rôle.');
        }
    }

    /**
     * @param  array<int>  $extraUserIds
     */
    private static function forgetProjectTasksCache(int $projectId): void
    {
        Cache::forget("project_tasks_all_{$projectId}");
    }

    private function invalidateMemberDashboardCaches(Task $task, array $extraUserIds = []): void
    {
        $ids = $task->assignees()->pluck('users.id')->all();
        if ($task->created_by) {
            $ids[] = (int) $task->created_by;
        }
        $ids = array_merge($ids, $extraUserIds);
        MemberDashboardService::forgetCacheForUsers(array_unique(array_filter($ids)));
    }

    private function forgetMemberDashboardForProject(Project $project): void
    {
        $ids = $project->members()->pluck('users.id');
        if ($project->owner_id) {
            $ids = $ids->push((int) $project->owner_id);
        }
        try {
            $ids = $ids->merge($project->users()->pluck('users.id'));
        } catch (\Throwable) {}
        MemberDashboardService::forgetCacheForUsers($ids->unique()->filter()->all());
    }

    /**
     * due_from / due_to on due_date; legacy due_after / due_before still supported.
     */
    private function applyDueDateRangeFilters(Request $request, Builder|\Illuminate\Database\Eloquent\Relations\Relation $query): void
    {
        $dueFrom = $request->filled('due_from')
            ? $request->date('due_from')
            : ($request->filled('due_after') ? $request->date('due_after') : null);
        $dueTo = $request->filled('due_to')
            ? $request->date('due_to')
            : ($request->filled('due_before') ? $request->date('due_before') : null);

        if ($dueFrom) {
            $query->whereDate('due_date', '>=', $dueFrom);
        }
        if ($dueTo) {
            $query->whereDate('due_date', '<=', $dueTo);
        }
    }
}
