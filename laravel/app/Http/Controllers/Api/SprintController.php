<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SprintResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Services\SprintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SprintController extends Controller
{
    public function __construct(
        private readonly SprintService $sprintService,
    ) {}

    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $sprints = $project->sprints()
            ->withCount('tasks')
            ->withCount(['tasks as tasks_done_count' => fn ($q) => $q->where('workflow_status', 'done')])
            ->withSum('tasks as story_points_total', 'story_points')
            ->withSum(['tasks as story_points_done' => fn ($q) => $q->where('workflow_status', 'done')], 'story_points')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'sprints' => SprintResource::collection($sprints),
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $this->sprintService->assertValidSprintDateRange(
            $data['start_date'] ?? null,
            $data['end_date'] ?? null,
        );

        $sprint = $project->sprints()->create($data);

        return response()->json([
            'message' => 'Sprint créé.',
            'sprint' => new SprintResource($sprint),
        ], 201);
    }

    public function update(Request $request, Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $mergedStart = $data['start_date'] ?? $sprint->start_date?->toDateString();
        $mergedEnd = $data['end_date'] ?? $sprint->end_date?->toDateString();
        $this->sprintService->assertValidSprintDateRange($mergedStart, $mergedEnd);

        $sprint = $this->sprintService->updateSprint($project, $sprint, $data);

        return response()->json([
            'message' => 'Sprint mis à jour.',
            'sprint' => new SprintResource($sprint),
        ]);
    }

    public function destroy(Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);
        $this->sprintService->deleteSprint($project, $sprint);

        return response()->json([
            'message' => 'Sprint supprimé.',
        ]);
    }

    public function start(Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);
        $sprint = $this->sprintService->startSprint($project, $sprint);

        return response()->json([
            'message' => 'Sprint démarré.',
            'sprint' => new SprintResource($sprint),
        ]);
    }

    public function end(Project $project, Sprint $sprint): JsonResponse
    {
        return $this->complete($project, $sprint);
    }

    public function complete(Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);
        $sprint = $this->sprintService->completeSprint($project, $sprint);

        return response()->json([
            'message' => 'Sprint terminé.',
            'sprint' => new SprintResource($sprint),
        ]);
    }

    public function backlog(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->whereNull('sprint_id')
            ->with(['status', 'creator', 'assignees'])
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
        ]);
    }

    public function reorderBacklog(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'integer|exists:tasks,id',
        ]);

        $this->sprintService->reorderBacklog($project, $data['task_ids']);

        return response()->json([
            'message' => 'Ordre du backlog mis à jour.',
        ]);
    }

    public function assignTask(Request $request, Project $project, Sprint $sprint, Task $task): JsonResponse
    {
        Gate::authorize('update', $project);

        $task = $this->sprintService->assignTaskToSprint(
            $project,
            $sprint,
            $task,
            (int) $request->user()->id,
        );

        return response()->json([
            'message' => 'Tâche assignée au sprint.',
            'task' => new TaskResource($task->load(['status', 'creator', 'assignees', 'sprint'])),
        ]);
    }
}
