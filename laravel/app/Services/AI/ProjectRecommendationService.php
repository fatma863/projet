<?php

namespace App\Services\AI;

use App\Models\Project;
use Carbon\Carbon;

class ProjectRecommendationService
{
    /**
     * Synthèse automatique : charge restante, échéance suggérée, pistes de rééquilibrage.
     */
    public function recommend(Project $project): array
    {
        $project->load(['members', 'tasks.assignees']);

        $tasks = $project->tasks;
        $active = $tasks->filter(fn ($t) => (int) ($t->progress_percent ?? 0) < 100);

        $overdue = $active->filter(function ($t) {
            if (! $t->due_date) {
                return false;
            }
            $due = $t->due_date instanceof Carbon ? $t->due_date : Carbon::parse($t->due_date)->startOfDay();

            return $due->isPast();
        });

        $prioritySuggestion = $overdue->count() > 0
            ? 'urgent'
            : (($active->avg('complexity') ?? 0) >= 7 ? 'high' : 'medium');

        $deadlineSuggestion = null;
        if ($active->count() > 0) {
            $remainingHours = (float) $active->sum(function ($t) {
                $estimated = (float) ($t->estimated_hours ?? $t->effectiveEstimatedHours() ?? 8);
                $done = max(0, min(100, (int) ($t->progress_percent ?? 0)));

                return $estimated * ((100 - $done) / 100);
            });
            $memberCount = max(1, $project->members()->count());
            $teamCapacityPerDay = max(6.0, $memberCount * 5.5);
            $extraDays = (int) ceil($remainingHours / $teamCapacityPerDay);
            $deadlineSuggestion = now()->addDays(max(1, $extraDays))->toDateString();
        }

        $redistribution = [];
        if ($overdue->count() > 0) {
            foreach ($project->members as $member) {
                $redistribution[] = [
                    'user_id' => $member->id,
                    'name' => $member->name,
                    'active_tasks' => $member->assignedTasks()
                        ->where('project_id', $project->id)
                        ->where('progress_percent', '<', 100)
                        ->count(),
                ];
            }
            usort($redistribution, fn ($a, $b) => $a['active_tasks'] <=> $b['active_tasks']);
            $redistribution = array_slice($redistribution, 0, 5);
        }

        return [
            'project_id' => $project->id,
            'summary' => [
                'active_tasks' => $active->count(),
                'overdue_tasks' => $overdue->count(),
                'suggested_priority_focus' => $prioritySuggestion,
            ],
            'priority_suggestion' => $prioritySuggestion,
            'deadline_suggestion' => $deadlineSuggestion,
            'deadline_suggestion_label' => $deadlineSuggestion
                ? 'Date cible indicative pour absorber le reste à faire (capacité équipe estimée).'
                : null,
            'redistribution_suggestion' => $overdue->count() > 0
                ? [
                    'reason' => 'Des tâches actives sont en retard : rééquilibrer ou prioriser.',
                    'target_users_low_workload' => $redistribution,
                    'tasks_overdue_count' => $overdue->count(),
                ]
                : null,
        ];
    }
}
