<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\CriticalPathService;
use App\Support\AccessControl;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class GanttController extends Controller
{
    public function __construct(
        private readonly CriticalPathService $criticalPathService,
    ) {}

    /**
     * All accessible tasks with planned_start (cross-project), for timeline / Gantt.
     */
    public function globalIndex(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Task::query()->with(['status', 'assignees', 'dependencies', 'dependents', 'project']);

        // ── Filtrage Gantt global selon le rôle ──────────────────────────────
        // Admin  → toutes les tâches planifiées de la plateforme
        // Chef   → toutes les tâches des projets qu'il gère + tâches assignées ailleurs
        // Membre → uniquement les tâches qui lui sont assignées (pas d'accès aux tâches d'autrui)
        // Client → bloqué par le middleware check.role:!client en amont
        if (! AccessControl::isAdmin($user)) {
            $chefProjectIds = Project::query()
                ->where('chef_id', $user->id)
                ->orWhere('owner_id', $user->id)
                ->pluck('id');

            if ($chefProjectIds->isNotEmpty()) {
                // Chef : toutes les tâches de ses projets + tâches assignées dans d'autres projets
                $query->where(function ($q) use ($user, $chefProjectIds) {
                    $q->whereIn('project_id', $chefProjectIds)
                      ->orWhereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
                });
            } else {
                // Membre simple : uniquement les tâches qui lui sont assignées
                $query->whereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
            }
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        $taskCollection = $query->whereNotNull('planned_start')
            ->orderBy('planned_start')
            ->get();

        $criticalIds = $this->criticalPathService->criticalTaskIds($taskCollection);

        $tasks = $taskCollection->map(function ($task) use ($criticalIds) {
            return [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'project_name' => $task->project?->name,
                'name' => $task->title,
                'start' => $task->planned_start?->toDateString(),
                'end' => $task->planned_end?->toDateString() ?? $task->planned_start?->toDateString(),
                'progress' => $task->progress_percent ?? 0,
                'priority' => $task->priority,
                'status' => $task->status?->name,
                'status_color' => $task->status?->color,
                'workflow_status' => $task->workflow_status ?? Task::inferWorkflowStatus($task),
                'parent_id' => $task->parent_id,
                'assignees' => $task->assignees->pluck('name'),
                'is_critical' => $criticalIds->contains($task->id),
                'is_delayed' => $task->isOverdue()
                    || ($task->planned_end && $task->due_date && $task->planned_end->greaterThan($task->due_date)),
                'dependencies' => $task->dependencies->map(fn ($d) => [
                    'id' => $d->id,
                    'type' => $d->pivot->type,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'gantt' => $tasks,
            'data' => $tasks,
        ]);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $user = $request->user();

        $query = $project->tasks()
            ->with(['status', 'assignees', 'dependencies', 'dependents'])
            ->whereNotNull('planned_start');

        // ── Visibilité selon le rôle ─────────────────────────────────────────
        // Admin          → toutes les tâches du projet
        // Client         → toutes les tâches (lecture seule ; écriture bloquée par check.project:edit)
        // Chef / Owner   → toutes les tâches du projet dont il est responsable
        // Membre simple  → uniquement les tâches qui lui sont assignées
        if (! AccessControl::isAdmin($user)
            && ! AccessControl::isClientRole($user)
            && (int) $project->chef_id   !== (int) $user->id
            && (int) $project->owner_id  !== (int) $user->id
        ) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id));
        }

        $taskCollection = $query->orderBy('planned_start')->get();

        $criticalIds = $this->criticalPathService->criticalTaskIds($taskCollection);

        $tasks = $taskCollection->map(function ($task) use ($criticalIds) {
            return [
                'id' => $task->id,
                'name' => $task->title,
                'start' => $task->planned_start?->toDateString(),
                'end' => $task->planned_end?->toDateString() ?? $task->planned_start?->toDateString(),
                'progress' => $task->progress_percent ?? 0,
                'priority' => $task->priority,
                'status' => $task->status?->name,
                'status_color' => $task->status?->color,
                'workflow_status' => $task->workflow_status ?? Task::inferWorkflowStatus($task),
                'parent_id' => $task->parent_id,
                'assignees' => $task->assignees->pluck('name'),
                'is_critical' => $criticalIds->contains($task->id),
                'is_delayed' => $task->isOverdue()
                    || ($task->planned_end && $task->due_date && $task->planned_end->greaterThan($task->due_date)),
                'dependencies' => $task->dependencies->map(fn ($d) => [
                    'id' => $d->id,
                    'type' => $d->pivot->type,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'gantt' => $tasks,
            'data' => $tasks,
        ]);
    }

    public function updateDates(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:tasks,id',
            'tasks.*.planned_start' => 'required|date',
            'tasks.*.planned_end' => 'required|date|after_or_equal:tasks.*.planned_start',
        ]);

        foreach ($data['tasks'] as $item) {
            $project->tasks()
                ->where('id', $item['id'])
                ->update([
                    'planned_start' => $item['planned_start'],
                    'planned_end' => $item['planned_end'],
                ]);
        }

        $this->propagateDelayToDependents($project, collect($data['tasks'])->pluck('id')->all());

        return response()->json(['message' => 'Dates Gantt mises à jour et dépendances recalculées.']);
    }

    private function propagateDelayToDependents(Project $project, array $updatedTaskIds): void
    {
        // Pre-load ALL project tasks with their dependents in 2 queries total (no N+1).
        $allTasks = $project->tasks()
            ->with(['dependents' => fn ($q) => $q->where('project_id', $project->id)])
            ->get()
            ->keyBy('id');

        $queue    = collect($updatedTaskIds)->unique()->values();
        $visited  = [];

        while ($queue->isNotEmpty()) {
            $taskId = $queue->shift();

            if (isset($visited[$taskId])) {
                continue;
            }
            $visited[$taskId] = true;

            /** @var Task|null $source */
            $source = $allTasks->get($taskId);
            if (! $source || ! $source->planned_end) {
                continue;
            }

            $requiredStart = Carbon::parse($source->planned_end)->addDay();

            foreach ($source->dependents as $dependent) {
                if (! $dependent->planned_start) {
                    continue;
                }

                $currentStart = Carbon::parse($dependent->planned_start);
                if ($currentStart->greaterThanOrEqualTo($requiredStart)) {
                    continue;
                }

                $currentEnd   = Carbon::parse($dependent->planned_end ?? $dependent->planned_start);
                $durationDays = max(0, $currentStart->diffInDays($currentEnd));
                $newStart     = $requiredStart->copy();
                $newEnd       = $requiredStart->copy()->addDays($durationDays);

                $dependent->update([
                    'planned_start' => $newStart->toDateString(),
                    'planned_end'   => $newEnd->toDateString(),
                ]);

                // Update in-memory cache so cascading dependents see the new dates.
                $dependent->planned_start = $newStart->toDateString();
                $dependent->planned_end   = $newEnd->toDateString();

                $queue->push($dependent->id);
            }
        }
    }
}
