<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class GanttController extends Controller
{
    public function show(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $taskCollection = $project->tasks()
            ->with(['status', 'assignees', 'dependencies', 'dependents'])
            ->whereNotNull('planned_start')
            ->orderBy('planned_start')
            ->get();

        $criticalIds = $this->computeCriticalPathTaskIds($taskCollection);

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
                'parent_id' => $task->parent_id,
                'assignees' => $task->assignees->pluck('name'),
                'is_critical' => $criticalIds->contains($task->id),
                'dependencies' => $task->dependencies->map(fn ($d) => [
                    'id' => $d->id,
                    'type' => $d->pivot->type,
                ])->values(),
            ];
        })->values();

        return response()->json(['gantt' => $tasks]);
    }

    public function updateDates(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'tasks'                => 'required|array',
            'tasks.*.id'           => 'required|exists:tasks,id',
            'tasks.*.planned_start'=> 'required|date',
            'tasks.*.planned_end'  => 'required|date|after_or_equal:tasks.*.planned_start',
        ]);

        foreach ($data['tasks'] as $item) {
            $project->tasks()
                ->where('id', $item['id'])
                ->update([
                    'planned_start' => $item['planned_start'],
                    'planned_end'   => $item['planned_end'],
                ]);
        }

        $this->propagateDelayToDependents($project, collect($data['tasks'])->pluck('id')->all());

        return response()->json(['message' => 'Dates Gantt mises à jour et dépendances recalculées.']);
    }

    private function propagateDelayToDependents(Project $project, array $updatedTaskIds): void
    {
        $queue = collect($updatedTaskIds)->unique()->values();

        while ($queue->isNotEmpty()) {
            $taskId = $queue->shift();
            /** @var Task|null $source */
            $source = $project->tasks()->with('dependents')->find($taskId);
            if (!$source || !$source->planned_end) {
                continue;
            }

            $requiredStart = Carbon::parse($source->planned_end)->addDay();
            $dependents = $source->dependents()->where('project_id', $project->id)->get();

            foreach ($dependents as $dependent) {
                if (!$dependent->planned_start) {
                    continue;
                }
                $currentStart = Carbon::parse($dependent->planned_start);
                if ($currentStart->greaterThanOrEqualTo($requiredStart)) {
                    continue;
                }

                $currentEnd = Carbon::parse($dependent->planned_end ?? $dependent->planned_start);
                $durationDays = max(0, $currentStart->diffInDays($currentEnd));

                $newStart = $requiredStart->copy();
                $newEnd = $requiredStart->copy()->addDays($durationDays);

                $dependent->update([
                    'planned_start' => $newStart->toDateString(),
                    'planned_end' => $newEnd->toDateString(),
                ]);

                $queue->push($dependent->id);
            }
        }
    }

    private function computeCriticalPathTaskIds($tasks)
    {
        if ($tasks->isEmpty()) {
            return collect();
        }

        $taskById = $tasks->keyBy('id');
        $successors = [];
        $predecessors = [];
        $inDegree = [];

        foreach ($tasks as $task) {
            $successors[$task->id] = [];
            $predecessors[$task->id] = [];
            $inDegree[$task->id] = 0;
        }

        foreach ($tasks as $task) {
            foreach ($task->dependencies as $dep) {
                if (!$taskById->has($dep->id)) {
                    continue;
                }
                $successors[$dep->id][] = $task->id;
                $predecessors[$task->id][] = $dep->id;
                $inDegree[$task->id]++;
            }
        }

        $queue = [];
        foreach ($inDegree as $id => $deg) {
            if ($deg === 0) {
                $queue[] = $id;
            }
        }

        $topo = [];
        while (!empty($queue)) {
            $id = array_shift($queue);
            $topo[] = $id;
            foreach ($successors[$id] as $next) {
                $inDegree[$next]--;
                if ($inDegree[$next] === 0) {
                    $queue[] = $next;
                }
            }
        }
        if (count($topo) !== $tasks->count()) {
            return collect();
        }

        $duration = [];
        foreach ($tasks as $task) {
            $start = Carbon::parse($task->planned_start);
            $end = Carbon::parse($task->planned_end ?? $task->planned_start);
            $duration[$task->id] = max(1, $start->diffInDays($end) + 1);
        }

        $es = array_fill_keys(array_keys($successors), 0);
        $ef = array_fill_keys(array_keys($successors), 0);

        foreach ($topo as $id) {
            $es[$id] = empty($predecessors[$id])
                ? 0
                : max(array_map(fn ($pred) => $ef[$pred], $predecessors[$id]));
            $ef[$id] = $es[$id] + $duration[$id];
        }

        $projectEnd = max($ef);
        $ls = array_fill_keys(array_keys($successors), 0);
        $lf = array_fill_keys(array_keys($successors), 0);

        for ($i = count($topo) - 1; $i >= 0; $i--) {
            $id = $topo[$i];
            $lf[$id] = empty($successors[$id])
                ? $projectEnd
                : min(array_map(fn ($succ) => $ls[$succ], $successors[$id]));
            $ls[$id] = $lf[$id] - $duration[$id];
        }

        $critical = [];
        foreach ($topo as $id) {
            if ($ls[$id] - $es[$id] === 0) {
                $critical[] = $id;
            }
        }

        return collect($critical);
    }
}
