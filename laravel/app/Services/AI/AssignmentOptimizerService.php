<?php

namespace App\Services\AI;

use App\Models\AiRecommendation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Collection;

class AssignmentOptimizerService
{
    /**
     * Suggest the best assignee(s) for a given task
     * based on workload, skills and performance history.
     */
    public function suggest(Task $task): array
    {
        $project = $task->project()->with('team.activeMembers')->first();

        if (!$project || !$project->team) {
            return $this->emptyResult($task, 'Aucune équipe associée au projet.');
        }

        $candidates = $project->team->activeMembers;

        if ($candidates->isEmpty()) {
            return $this->emptyResult($task, 'Aucun membre actif dans l\'équipe.');
        }

        $scored = $candidates->map(function (User $user) use ($task, $project) {
            $workloadScore = $this->workloadScore($user, $project);
            $performanceScore = $this->performanceScore($user);
            $total = round(($workloadScore * 0.55) + ($performanceScore * 0.45), 1);

            return [
                'user_id'    => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'scores'     => [
                    'workload' => $workloadScore,
                    'performance' => $performanceScore,
                ],
                'total'      => $total,
                'capacity_hours' => (float) $user->pivot->capacity_hours_per_week,
                'skills'     => json_decode($user->pivot->skills ?? '[]', true),
            ];
        });

        // Sort by total score descending
        $ranked = $scored->sortByDesc('total')->values()->toArray();

        $confidence = $this->calculateConfidence($ranked, $candidates->count());

        $result = [
            'suggestions'  => array_slice($ranked, 0, 5),
            'best_match'   => $ranked[0] ?? null,
            'recommended_user' => $ranked[0] ?? null,
            'confidence'   => $confidence,
            'criteria'     => [
                'workload_weight' => '55%',
                'performance_weight' => '45%',
            ],
        ];

        AiRecommendation::create([
            'task_id'     => $task->id,
            'project_id'  => $task->project_id,
            'type'        => 'assignment',
            'input_data'  => [
                'task_id'    => $task->id,
                'title'      => $task->title,
                'complexity' => $task->complexity,
                'priority'   => $task->priority,
            ],
            'result_data' => $result,
            'confidence'  => $confidence,
        ]);

        return $result;
    }

    /**
     * Optimize assignments for all unassigned tasks in a project.
     */
    public function optimizeProject(Project $project): array
    {
        $unassigned = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->whereDoesntHave('assignees')
            ->orderByDesc('priority')
            ->orderByDesc('complexity')
            ->get();

        $suggestions = [];
        foreach ($unassigned as $task) {
            $result = $this->suggest($task);
            $suggestions[] = [
                'task_id'   => $task->id,
                'title'     => $task->title,
                'priority'  => $task->priority,
                'complexity'=> $task->complexity,
                'best_match'=> $result['best_match'],
                'confidence'=> $result['confidence'],
            ];
        }

        return [
            'unassigned_count' => $unassigned->count(),
            'suggestions'      => $suggestions,
        ];
    }

    private function workloadScore(User $user, Project $project): float
    {
        $activeTasks = $user->assignedTasks()
            ->where('progress_percent', '<', 100)
            ->count();

        // 0 tasks = 100, 1 = 85, 2 = 70, ... max 10+
        return max(0, 100 - ($activeTasks * 12));
    }

    private function performanceScore(User $user): float
    {
        $completed = $user->assignedTasks()
            ->where('progress_percent', 100)
            ->whereNotNull('estimated_hours')
            ->where('estimated_hours', '>', 0)
            ->get();

        if ($completed->isEmpty()) {
            return 55.0;
        }

        $onTimeRatio = $completed->filter(function ($task) {
            if (!$task->due_date || !$task->planned_end) {
                return true;
            }
            return $task->planned_end->lessThanOrEqualTo($task->due_date);
        })->count() / max(1, $completed->count());

        $accuracyRatio = $completed->avg(function ($task) {
            $actual = max(0.1, (float) $task->actual_hours);
            $est = max(0.1, (float) $task->estimated_hours);
            $diff = abs($actual - $est) / $est;
            return max(0, 1 - min(1, $diff));
        });

        return round(min(100, ($onTimeRatio * 60 + $accuracyRatio * 40) * 100), 1);
    }

    private function calculateConfidence(array $ranked, int $teamSize): float
    {
        if (empty($ranked)) {
            return 0.1;
        }

        $topScore = $ranked[0]['total'];
        $secondScore = $ranked[1]['total'] ?? 0;
        $gap = $topScore - $secondScore;

        // More confidence when: clear winner + bigger team + higher scores
        $confidence = 0.3;
        $confidence += min(0.3, $gap / 100);
        $confidence += min(0.2, $teamSize * 0.04);
        $confidence += min(0.2, $topScore / 500);

        return round(min(0.95, $confidence), 2);
    }

    private function emptyResult(Task $task, string $reason): array
    {
        return [
            'suggestions' => [],
            'best_match'  => null,
            'confidence'  => 0,
            'message'     => $reason,
        ];
    }
}
