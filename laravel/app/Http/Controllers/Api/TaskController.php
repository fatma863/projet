<?php

namespace App\Http\Controllers\Api;

use App\Events\TaskCommentCreated;
use App\Events\TaskCommentDeleted;
use App\Http\Controllers\Controller;
use App\Http\Resources\AttachmentResource;
use App\Http\Resources\CommentResource;
use App\Http\Resources\TaskAssigneeResource;
use App\Http\Resources\TaskDependencyResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TimeEntryResource;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskComment;
use App\Models\TimeEntry;
use App\Services\ActivityLogService;
use App\Services\AIService;
use App\Services\MentionService;
use App\Services\NotificationService;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
        private readonly MentionService $mentionService,
        private readonly NotificationService $notificationService,
        private readonly AIService $aiService,
    ) {
    }

    // ─── CRUD ────────────────────────────────────────────

    public function globalIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Task::query()->accessibleBy($user)->with(['status', 'creator', 'assignees', 'project', 'sprint']);

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

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $tasks = $request->boolean('all')
            ? $query->orderByDesc('updated_at')->get()
            : $query->orderByDesc('updated_at')->paginate($request->input('per_page', 20));

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'meta' => $request->boolean('all') ? null : [
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
            ->with(['status', 'creator', 'assignees', 'parent', 'sprint']);

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->assignee_id));
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

        $sortField = $request->input('sort', 'kanban_order');
        $sortDir = $request->input('direction', 'asc');
        $query->orderBy($sortField, $sortDir);

        $tasks = $request->boolean('all')
            ? $query->get()
            : $query->paginate($request->input('per_page', 20));

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
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'status_id'       => 'required|exists:task_statuses,id',
            'priority'        => 'sometimes|in:low,medium,high,urgent',
            'complexity'      => 'nullable|integer|min:1|max:10',
            'story_points'    => 'nullable|integer|min:0|max:1000',
            'planned_start'   => 'nullable|date',
            'planned_end'     => 'nullable|date|after_or_equal:planned_start',
            'due_date'        => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_duration' => 'nullable|integer|min:0',
            'workflow_status' => 'sometimes|in:todo,in_progress,done,at_risk',
            'parent_id'       => 'nullable|exists:tasks,id',
            'sprint_id'       => 'nullable|exists:sprints,id',
            'ai_auto_assign'  => 'sometimes|boolean',
        ]);

        $maxOrder = $project->tasks()
            ->where('status_id', $data['status_id'])
            ->max('kanban_order') ?? -1;

        $data['created_by'] = Auth::id();
        $data['kanban_order'] = $maxOrder + 1;

        $task = $project->tasks()->create($data);
        if (! isset($data['workflow_status'])) {
            $task->refreshWorkflowStatus();
        }
        $this->aiService->applyOnTaskCreate($task, $request->boolean('ai_auto_assign'));
        $task->refresh();
        $task->load(['status', 'creator', 'assignees']);
        $this->activityLogService->log($project, Auth::user(), 'task.created', $task, [
            'task_title' => $task->title,
            'status_id' => $task->status_id,
        ]);

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
            'dependents.status', 'comments.user', 'attachments.user',
            'timeEntries.user',
        ]);

        return response()->json(['task' => new TaskResource($task)]);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $hasWorkflow = $request->has('workflow_status');

        $data = $request->validate([
            'title'           => 'sometimes|required|string|max:255',
            'description'     => 'nullable|string',
            'status_id'       => 'sometimes|exists:task_statuses,id',
            'priority'        => 'sometimes|in:low,medium,high,urgent',
            'complexity'      => 'nullable|integer|min:1|max:10',
            'story_points'    => 'nullable|integer|min:0|max:1000',
            'planned_start'   => 'nullable|date',
            'planned_end'     => 'nullable|date|after_or_equal:planned_start',
            'due_date'        => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_duration' => 'nullable|integer|min:0',
            'actual_hours'    => 'nullable|numeric|min:0',
            'progress_percent'=> 'nullable|integer|min:0|max:100',
            'workflow_status' => 'sometimes|in:todo,in_progress,done,at_risk',
            'parent_id'       => 'nullable|exists:tasks,id',
            'sprint_id'       => 'nullable|exists:sprints,id',
        ]);

        $data['updated_by'] = Auth::id();
        $task->update($data);
        $this->aiService->refreshRiskAfterUpdate($task);
        $task->refresh();
        if (! $hasWorkflow) {
            $task->refreshWorkflowStatus();
        }
        $task->load(['status', 'creator', 'assignees']);
        $this->activityLogService->log($task->project, Auth::user(), 'task.updated', $task, [
            'status_id' => $task->status_id,
            'progress_percent' => $task->progress_percent,
        ]);
        $this->notifyDelayIfNeeded($task);

        return response()->json([
            'message' => 'Tâche mise à jour.',
            'task' => new TaskResource($task),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);
        $project = $task->project;
        $title = $task->title;
        $task->delete();
        $this->activityLogService->log($project, Auth::user(), 'task.deleted', $task, [
            'task_title' => $title,
        ]);
        return response()->json(['message' => 'Tâche supprimée.']);
    }

    // ─── KANBAN MOVE ────────────────────────────────────

    public function move(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'status_id'    => 'required|exists:task_statuses,id',
            'kanban_order'   => 'required|integer|min:0',
        ]);

        // Re-order other tasks in the target column
        Task::where('project_id', $task->project_id)
            ->where('status_id', $data['status_id'])
            ->where('kanban_order', '>=', $data['kanban_order'])
            ->increment('kanban_order');

        $task->update([
            'status_id'    => $data['status_id'],
            'kanban_order'   => $data['kanban_order'],
            'updated_by'     => Auth::id(),
        ]);
        $this->activityLogService->log($task->project, Auth::user(), 'task.moved', $task, [
            'status_id' => $task->status_id,
            'kanban_order' => $task->kanban_order,
        ]);
        $this->notifyDelayIfNeeded($task);
        $this->aiService->refreshRiskAfterUpdate($task);
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
            'user_id'            => 'required|exists:users,id',
            'allocation_percent' => 'sometimes|integer|min:1|max:100',
        ]);

        $assignment = TaskAssignment::updateOrCreate(
            ['task_id' => $task->id, 'user_id' => $data['user_id']],
            [
                'allocation_percent' => $data['allocation_percent'] ?? 100,
                'assigned_at'        => now(),
            ]
        );
        $this->activityLogService->log($task->project, Auth::user(), 'task.assigned', $task, [
            'assigned_user_id' => $data['user_id'],
            'allocation_percent' => $assignment->allocation_percent,
        ]);
        $assignee = $assignment->user()->first();
        if ($assignee && $assignee->id !== Auth::id()) {
            $this->notificationService->notifyTaskAssigned($task, $assignee, Auth::user());
        }

        $this->aiService->refreshRiskAfterUpdate($task);

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

        $this->aiService->refreshRiskAfterUpdate($task);

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
            'type'               => 'sometimes|in:FS,SS,FF,SF',
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
            ->with('user')
            ->orderBy('created_at', 'desc')
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
            'body' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'body'    => $data['body'],
        ]);
        $comment->load('user', 'task');
        $this->activityLogService->log($task->project, Auth::user(), 'task.comment_added', $comment, [
            'task_id' => $task->id,
            'comment_preview' => mb_substr($comment->body, 0, 120),
        ]);
        $this->mentionService->notifyMentions($comment);
        broadcast(new TaskCommentCreated($comment))->toOthers();

        return response()->json([
            'message' => 'Commentaire ajouté.',
            'comment' => new CommentResource($comment->load('user')),
        ], 201);
    }

    public function deleteComment(Task $task, TaskComment $comment): JsonResponse
    {
        if ($comment->task_id !== $task->id) {
            abort(404);
        }
        if ($comment->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
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
            'url'  => 'required_if:type,link|nullable|url|max:2048',
            'filename' => 'required_if:type,link|nullable|string|max:255',
        ]);

        if ($data['type'] === 'file') {
            $file = $request->file('file');
            $path = $file->store("tasks/{$task->id}/attachments", 'local');

            $attachment = $task->attachments()->create([
                'user_id'    => Auth::id(),
                'type'       => 'file',
                'path_or_url'=> $path,
                'filename'   => $file->getClientOriginalName(),
                'mime'       => $file->getMimeType(),
                'size'       => $file->getSize(),
            ]);
        } else {
            $attachment = $task->attachments()->create([
                'user_id'    => Auth::id(),
                'type'       => 'link',
                'path_or_url'=> $data['url'],
                'filename'   => $data['filename'] ?? null,
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
        if ($attachment->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        if ($attachment->type === 'file' && $attachment->path_or_url) {
            Storage::disk('local')->delete($attachment->path_or_url);
        }

        $attachment->delete();
        return response()->json(['message' => 'Pièce jointe supprimée.']);
    }

    // ─── TIME ENTRIES ───────────────────────────────────

    public function timeEntries(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'time_entries' => TimeEntryResource::collection(
                $task->timeEntries()->with('user')->orderByDesc('started_at')->get()
            ),
        ]);
    }

    public function addTimeEntry(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $this->authorizeProjectWrite($request->user(), $task->project);

        $data = $request->validate([
            'source'  => 'sometimes|in:manual,timer',
            'date'    => 'required|date',
            'minutes' => 'required|integer|min:1',
            'note'    => 'nullable|string|max:500',
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
        if ($timeEntry->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $this->activityLogService->log($task->project, Auth::user(), 'task.time_deleted', $timeEntry, [
            'time_entry_id' => $timeEntry->id,
        ]);
        $timeEntry->delete();
        return response()->json(['message' => 'Entrée de temps supprimée.']);
    }

    private function notifyDelayIfNeeded(Task $task): void
    {
        $isOverdueByDueDate = $task->due_date && $task->due_date->isPast() && (int) $task->progress_percent < 100;
        $isOverdueByPlan = $task->due_date && $task->planned_end && $task->planned_end->greaterThan($task->due_date);

        if ($isOverdueByDueDate || $isOverdueByPlan) {
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
}
