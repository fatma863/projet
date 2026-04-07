<?php

namespace App\Services;

use App\Models\Task;

class TaskDependencyService
{
    public function isPredecessorDone(Task $predecessor): bool
    {
        return (int) ($predecessor->progress_percent ?? 0) >= 100
            || ($predecessor->workflow_status ?? '') === 'done';
    }

    /**
     * Même règle que MemberDashboardService::effectiveEndDate / isOverdue pour cohérence Gantt.
     */
    public function isOpenTaskOverdue(Task $task): bool
    {
        if ($this->isPredecessorDone($task)) {
            return false;
        }

        $end = $task->planned_end
            ? $task->planned_end->copy()->endOfDay()
            : ($task->due_date ? $task->due_date->copy()->endOfDay() : null);

        if (! $end) {
            return false;
        }

        return $end->isPast();
    }

    public function isTaskBlocked(Task $task): bool
    {
        if (! $task->relationLoaded('dependencies')) {
            $task->load('dependencies');
        }

        foreach ($task->dependencies as $dep) {
            if (! $this->isPredecessorDone($dep)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Prédécesseur non terminé et en retard → la tâche courante est « à risque » (effet Gantt).
     */
    public function hasOverdueOpenPredecessor(Task $task): bool
    {
        if (! $task->relationLoaded('dependencies')) {
            $task->load('dependencies');
        }

        foreach ($task->dependencies as $dep) {
            if ($this->isPredecessorDone($dep)) {
                continue;
            }
            if ($this->isOpenTaskOverdue($dep)) {
                return true;
            }
        }

        return false;
    }
}
