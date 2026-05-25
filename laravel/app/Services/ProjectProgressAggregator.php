<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;

/**
 * Computes a weighted average of task progress for the whole project.
 *
 * Task weight = story_points ?? complexity ?? 1
 * High/urgent priority tasks get 1.5× weight.
 */
class ProjectProgressAggregator
{
    public function calculate(Project $project): int
    {
        $tasks = Task::where('project_id', $project->id)
            ->whereNull('parent_id')           // top-level tasks only
            ->select(['id', 'progress_percent', 'story_points', 'complexity', 'priority'])
            ->get();

        if ($tasks->isEmpty()) {
            return 0;
        }

        $weightedSum  = 0.0;
        $totalWeight  = 0.0;

        foreach ($tasks as $task) {
            $base   = (float) ($task->story_points ?? $task->complexity ?? 1);
            $weight = in_array($task->priority, ['high', 'urgent']) ? $base * 1.5 : $base;

            $weightedSum += $weight * (float) ($task->progress_percent ?? 0);
            $totalWeight += $weight;
        }

        if ($totalWeight <= 0) {
            return 0;
        }

        return (int) round($weightedSum / $totalWeight);
    }

    public function recalculateAndSave(Project $project): int
    {
        $progress = $this->calculate($project);
        $project->updateQuietly(['progress_percent' => $progress]);

        return $progress;
    }
}
