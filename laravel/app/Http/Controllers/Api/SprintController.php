<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SprintResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SprintController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $sprints = $project->sprints()->withCount('tasks')->orderByDesc('created_at')->get();

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
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $sprint = $project->sprints()->create($data);

        return response()->json([
            'message' => 'Sprint créé.',
            'sprint' => new SprintResource($sprint),
        ], 201);
    }

    public function start(Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);
        $this->ensureSprintBelongsToProject($project, $sprint);

        $project->sprints()->where('status', 'active')->update(['status' => 'completed', 'ended_at' => now()]);
        $sprint->update(['status' => 'active', 'started_at' => now()]);

        return response()->json([
            'message' => 'Sprint démarré.',
            'sprint' => new SprintResource($sprint->fresh()),
        ]);
    }

    public function end(Project $project, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $project);
        $this->ensureSprintBelongsToProject($project, $sprint);

        $sprint->update(['status' => 'completed', 'ended_at' => now()]);

        return response()->json([
            'message' => 'Sprint terminé.',
            'sprint' => new SprintResource($sprint->fresh()),
        ]);
    }

    public function backlog(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->whereNull('sprint_id')
            ->with(['status', 'creator', 'assignees'])
            ->orderBy('kanban_order')
            ->get();

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
        ]);
    }

    public function assignTask(Request $request, Project $project, Sprint $sprint, Task $task): JsonResponse
    {
        Gate::authorize('update', $project);
        $this->ensureSprintBelongsToProject($project, $sprint);
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $task->update(['sprint_id' => $sprint->id, 'updated_by' => $request->user()->id]);

        return response()->json([
            'message' => 'Tâche assignée au sprint.',
            'task' => new TaskResource($task->fresh(['status', 'creator', 'assignees', 'sprint'])),
        ]);
    }

    private function ensureSprintBelongsToProject(Project $project, Sprint $sprint): void
    {
        if ($sprint->project_id !== $project->id) {
            abort(404);
        }
    }
}
