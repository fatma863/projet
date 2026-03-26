<?php

namespace App\Services\AI;

use App\Models\Project;

class ProjectRecommendationService
{
    public function recommend(Project $project): array
    {
        $tasks = $project->tasks()->with(['assignees'])->get();
        $active = $tasks->where('progress_percent', '<', 100);
        $overdue = $active->filter(fn ($t) => $t->due_date && $t->due_date->isPast());

        $prioritySuggestion = $overdue->count() > 0 ? 'urgent' : ($active->avg('complexity') >= 7 ? 'high' : 'medium');

        $deadlineSuggestion = null;
        if ($active->count() > 0) {
            $remainingHours = (float) $active->sum(function ($t) {
                $estimated = (float) ($t->estimated_hours ?? 8);
                $done = max(0, min(100, (int) $t->progress_percent));
                return $estimated * ((100 - $done) / 100);
            });
            $teamCapacityPerDay = max(6, $project->members()->count() * 5.5);
            $extraDays = (int) ceil($remainingHours / $teamCapacityPerDay);
            $deadlineSuggestion = now()->addDays(max(1, $extraDays))->toDateString();
        }

        $redistribution = [];
        if ($overdue->count() > 0) {
            $byUserLoad = [];
            foreach ($project->members as $member) {
                $byUserLoad[] = [
                    'user_id' => $member->id,
                    'name' => $member->name,
                    'active_tasks' => $member->assignedTasks()->where('project_id', $project->id)->where('progress_percent', '<', 100)->count(),
                ];
            }
            usort($byUserLoad, fn ($a, $b) => $a['active_tasks'] <=> $b['active_tasks']);
            $redistribution = array_slice($byUserLoad, 0, 3);
        }

        return [
            'project_id' => $project->id,
            'priority_suggestion' => $prioritySuggestion,
            'deadline_suggestion' => $deadlineSuggestion,
            'redistribution_suggestion' => $overdue->count() > 0
                ? [
                    'reason' => 'Project shows delay signals',
                    'target_users_low_workload' => $redistribution,
                    'tasks_overdue_count' => $overdue->count(),
                ]
                : null,
        ];
    }
}
