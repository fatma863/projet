<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CriticalPathService
{
    /**
     * CPM on tasks with planned_start (same project). Uses task_dependencies (FS).
     * Duration: duration_days if set, else calendar span from planned_start → planned_end.
     *
     * @return array{
     *   critical_tasks: array<int, array<string, mixed>>,
     *   total_duration: float,
     *   graph_valid: bool,
     *   message?: string
     * }
     */
    public function analyzeProject(Project $project): array
    {
        $tasks = $project->tasks()
            ->with(['dependencies', 'status'])
            ->whereNotNull('planned_start')
            ->orderBy('planned_start')
            ->get();

        if ($tasks->isEmpty()) {
            return [
                'critical_tasks' => [],
                'total_duration' => 0.0,
                'graph_valid' => true,
                'message' => 'Aucune tâche avec date de début planifiée.',
            ];
        }

        return $this->computeFromCollection($tasks);
    }

    /**
     * @param  Collection<int, Task>  $tasks
     * @return Collection<int, int> task ids on critical path
     */
    public function criticalTaskIds(Collection $tasks): Collection
    {
        if ($tasks->isEmpty()) {
            return collect();
        }

        $result = $this->computeFromCollection($tasks);

        return collect($result['critical_tasks'])->pluck('id');
    }

    /**
     * @param  Collection<int, Task>  $tasks
     * @return array{
     *   critical_tasks: array,
     *   total_duration: float,
     *   graph_valid: bool,
     *   message?: string
     * }
     */
    private function computeFromCollection(Collection $tasks): array
    {
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
                if (! $taskById->has($dep->id)) {
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
        while (! empty($queue)) {
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
            return [
                'critical_tasks' => [],
                'total_duration' => 0.0,
                'graph_valid' => false,
                'message' => 'Le graphe de dépendances contient un cycle ou des liens invalides.',
            ];
        }

        $duration = [];
        foreach ($tasks as $task) {
            $duration[$task->id] = $this->taskDurationDays($task);
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

        $criticalTasks = [];
        foreach ($topo as $id) {
            $slack = $ls[$id] - $es[$id];
            if (abs($slack) > 0.0001) {
                continue;
            }
            /** @var Task $task */
            $task = $taskById->get($id);
            $criticalTasks[] = $this->formatCriticalTask(
                $task,
                $es[$id],
                $ef[$id],
                $ls[$id],
                $lf[$id],
                0.0,
                $duration[$id]
            );
        }

        return [
            'critical_tasks' => $criticalTasks,
            'total_duration' => (float) $projectEnd,
            'graph_valid' => true,
        ];
    }

    private function taskDurationDays(Task $task): int
    {
        if ($task->duration_days !== null && (int) $task->duration_days > 0) {
            return (int) $task->duration_days;
        }

        $start = $task->planned_start ? Carbon::parse($task->planned_start)->startOfDay() : null;
        $end = $task->planned_end
            ? Carbon::parse($task->planned_end)->startOfDay()
            : ($start ? $start->copy() : null);

        if (! $start || ! $end) {
            return 1;
        }

        return max(1, $start->diffInDays($end) + 1);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatCriticalTask(
        Task $task,
        float $es,
        float $ef,
        float $ls,
        float $lf,
        float $slack,
        int $durationDays
    ): array {
        $isDelayed = $task->isOverdue()
            || ($task->planned_end && $task->due_date
                && Carbon::parse($task->planned_end)->greaterThan(Carbon::parse($task->due_date)));

        return [
            'id' => $task->id,
            'title' => $task->title,
            'es' => $es,
            'ef' => $ef,
            'ls' => $ls,
            'lf' => $lf,
            'slack' => $slack,
            'duration_days' => $durationDays,
            'planned_start' => $task->planned_start?->toDateString(),
            'planned_end' => $task->planned_end?->toDateString(),
            'is_delayed' => $isDelayed,
        ];
    }
}
