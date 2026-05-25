<?php

namespace App\Services;

use App\Models\Task;

/**
 * Hybrid progress formula (weights sum to 1.0):
 *   subtasks   35%  — ratio of done subtasks
 *   time       25%  — ratio of actual vs estimated hours
 *   checklist  15%  — ratio of checked items
 *   workflow   10%  — workflow_status mapped score
 *   activity   10%  — activity_score / 100 (capped)
 *   validation  5%  — manager_validation when set
 *
 * If a factor has no data its weight is redistributed to the remaining factors.
 * done=100 and todo=0 always short-circuit the formula.
 */
class ProgressCalculationService
{
    private const WEIGHTS = [
        'subtasks'   => 0.35,
        'time'       => 0.25,
        'checklist'  => 0.15,
        'workflow'   => 0.10,
        'activity'   => 0.10,
        'validation' => 0.05,
    ];

    public function calculate(Task $task): int
    {
        // Short-circuits
        if ($task->progress_mode === 'manual') {
            return $task->progress_percent ?? 0;
        }

        $ws = $task->workflow_status ?? 'todo';

        if ($ws === 'done') {
            return 100;
        }
        if ($ws === 'todo') {
            return 0;
        }

        $scores  = [];
        $weights = self::WEIGHTS;

        // 1. Subtasks
        $subtaskTotal = $task->subtasks()->count();
        if ($subtaskTotal > 0) {
            $subtaskDone   = $task->subtasks()->where('workflow_status', 'done')->count();
            $scores['subtasks'] = $subtaskDone / $subtaskTotal;
        } else {
            unset($weights['subtasks']);
        }

        // 2. Time (actual vs estimated)
        $estimated = (float) ($task->estimated_hours ?? 0);
        $actual    = (float) ($task->actual_hours    ?? 0);
        if ($estimated > 0) {
            $scores['time'] = min($actual / $estimated, 1.0);
        } else {
            unset($weights['time']);
        }

        // 3. Checklist
        $checklist = $task->checklist ?? [];
        if (is_array($checklist) && count($checklist) > 0) {
            $checked = count(array_filter($checklist, fn($item) => (bool) ($item['done'] ?? false)));
            $scores['checklist'] = $checked / count($checklist);
        } else {
            unset($weights['checklist']);
        }

        // 4. Workflow status score
        $workflowScores = [
            'todo'        => 0.0,
            'in_progress' => 0.5,
            'in_review'   => 0.8,
            'blocked'     => 0.3,
            'at_risk'     => 0.4,
            'done'        => 1.0,
        ];
        $scores['workflow'] = $workflowScores[$ws] ?? 0.5;

        // 5. Activity score (capped at 100, normalize to 0-1)
        $activityScore = min((int) ($task->activity_score ?? 0), 100);
        $scores['activity'] = $activityScore / 100;

        // 6. Manager validation
        if ($task->manager_validation !== null) {
            $scores['validation'] = min((int) $task->manager_validation, 100) / 100;
        } else {
            unset($weights['validation']);
        }

        // Normalize weights to sum = 1 for available factors
        $totalWeight = array_sum($weights);
        if ($totalWeight <= 0) {
            return 0;
        }

        $result = 0.0;
        foreach ($weights as $factor => $w) {
            $normalizedWeight = $w / $totalWeight;
            $result += $normalizedWeight * ($scores[$factor] ?? 0);
        }

        // Clamp to 1-99 for in-progress tasks (never auto-100, user must mark done)
        return max(1, min(99, (int) round($result * 100)));
    }

    public function recalculateAndSave(Task $task): int
    {
        $progress = $this->calculate($task);

        // Use updateQuietly to avoid triggering model observers/booted hooks
        $task->updateQuietly(['progress_percent' => $progress]);

        return $progress;
    }
}
