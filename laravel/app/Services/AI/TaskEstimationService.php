<?php

namespace App\Services\AI;

use App\Models\AiRecommendation;
use App\Models\Task;
use Illuminate\Support\Collection;

class TaskEstimationService
{
    public function estimate(Task $task): array
    {
        $input = [
            'task_id'    => $task->id,
            'title'      => $task->title,
            'complexity' => $task->complexity,
            'priority'   => $task->priority,
            'project_id' => $task->project_id,
        ];

        $completed = Task::query()
            ->where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('planned_start')
            ->whereNotNull('planned_end')
            ->get();

        $sameProject = $completed->where('project_id', $task->project_id);
        $similar = $this->similarTasks($task, $completed);
        $similarProject = $similar->where('project_id', $task->project_id);

        $pool = $similarProject->count() >= 2
            ? $similarProject
            : ($similar->count() >= 3 ? $similar : $sameProject);

        $estimatedHours = $this->estimateHoursFromPool($task, $pool);
        $avgCompletionDays = round(max(1, $pool->avg(fn ($t) => $this->completionDays($t))), 1);
        $estimatedDurationDays = max(1, round(($avgCompletionDays + ($estimatedHours / 6)) / 2, 1));
        $confidence = $this->confidenceFromPool($pool);
        $method = $pool === $similarProject
            ? 'similar_tasks_same_project'
            : ($pool === $similar ? 'similar_tasks_global' : 'project_historical_average');

        $result = [
            'estimated_hours' => $estimatedHours,
            'estimated_days'  => $estimatedDurationDays,
            'estimated_duration' => $estimatedDurationDays.' days',
            'average_completion_time_days' => $avgCompletionDays,
            'confidence'      => round($confidence, 2),
            'method'          => $method,
            'sample_size'     => $pool->count(),
            'comparable_tasks' => $pool->take(5)->map(fn ($t) => [
                'id' => $t->id,
                'title' => $t->title,
                'actual_hours' => (float) ($t->actual_hours ?? 0),
                'completion_days' => $this->completionDays($t),
            ])->values(),
            'comparable_range' => $this->getRange($pool),
        ];

        // Save recommendation
        AiRecommendation::create([
            'task_id'     => $task->id,
            'project_id'  => $task->project_id,
            'type'        => 'estimation',
            'input_data'  => $input,
            'result_data' => $result,
            'confidence'  => $result['confidence'],
        ]);

        return $result;
    }

    private function similarTasks(Task $target, Collection $tasks): Collection
    {
        $targetTokens = $this->tokens($target->title.' '.($target->description ?? ''));

        return $tasks->filter(function (Task $candidate) use ($target, $targetTokens) {
            $complexityClose = abs((int) $candidate->complexity - (int) $target->complexity) <= 2;
            $samePriority = $candidate->priority === $target->priority;
            $candidateTokens = $this->tokens($candidate->title.' '.($candidate->description ?? ''));
            $tokenOverlap = $targetTokens->intersect($candidateTokens)->count();

            return $complexityClose || $samePriority || $tokenOverlap >= 2;
        })->values();
    }

    private function estimateHoursFromPool(Task $task, Collection $pool): float
    {
        if ($pool->isEmpty()) {
            return $this->defaultEstimate((int) $task->complexity);
        }

        $values = $pool->pluck('actual_hours')->filter()->map(fn ($v) => (float) $v)->sort()->values();
        if ($values->isEmpty()) {
            return $this->defaultEstimate((int) $task->complexity);
        }

        $mid = (int) floor(($values->count() - 1) / 2);
        $median = $values->count() % 2 === 0
            ? ($values[$mid] + $values[$mid + 1]) / 2
            : $values[$mid];

        return round($median, 1);
    }

    private function confidenceFromPool(Collection $pool): float
    {
        return min(0.95, 0.35 + ($pool->count() * 0.06));
    }

    private function getRange(Collection $pool): ?array
    {
        if ($pool->isEmpty()) {
            return null;
        }

        return [
            'min' => round($pool->min('actual_hours'), 1),
            'max' => round($pool->max('actual_hours'), 1),
        ];
    }

    private function completionDays(Task $task): int
    {
        $start = $task->planned_start ?? $task->created_at;
        $end = $task->planned_end ?? $task->updated_at;
        if (!$start || !$end) {
            return 1;
        }
        return max(1, $start->diffInDays($end) + 1);
    }

    private function tokens(string $text): Collection
    {
        return collect(preg_split('/[^a-z0-9]+/i', mb_strtolower($text)))
            ->filter(fn ($token) => mb_strlen($token) >= 3)
            ->unique()
            ->values();
    }

    private function defaultEstimate(int $complexity): float
    {
        return match(true) {
            $complexity <= 2 => 4.0,
            $complexity <= 4 => 8.0,
            $complexity <= 6 => 16.0,
            $complexity <= 8 => 28.0,
            default => 48.0,
        };
    }
}
