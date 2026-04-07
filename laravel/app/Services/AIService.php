<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

/**
 * Règles métier intelligentes (sans ML) : durée, risque, assignation.
 */
class AIService
{
    private const BASE_MINUTES = 120;

    /**
     * Estimation de durée en minutes.
     */
    public function estimateTaskDuration(Task $task): int
    {
        $sp = (int) ($task->story_points ?? 0);
        if ($sp > 0) {
            $minutes = (int) round($sp * Task::DEFAULT_HOURS_PER_STORY_POINT * 60);
        } else {
            $minutes = self::BASE_MINUTES;
        }

        $minutes *= match ($task->priority) {
            'urgent' => 0.75,
            'high' => 0.88,
            'low' => 1.18,
            default => 1.0,
        };

        $descLen = mb_strlen((string) ($task->description ?? ''));
        if ($descLen > 100) {
            $minutes *= 1.12;
        }

        $similarAvgHours = $this->similarTasksAverageHours($task);
        if ($similarAvgHours !== null) {
            $fromSimilar = (int) round($similarAvgHours * 60);
            $minutes = (int) round(($minutes + $fromSimilar) / 2);
        }

        return max(30, min(60 * 200, $minutes));
    }

    /**
     * @return array{risk_level: string, risk_score: int, factors: array<int, string>}
     */
    public function detectTaskRisk(Task $task, bool $persist = false): array
    {
        if ($task->isCompleted()) {
            $result = ['risk_level' => 'low', 'risk_score' => 0, 'factors' => ['Tâche terminée']];
            if ($persist) {
                $this->persistRisk($task, $result);
            }

            return $result;
        }

        $now = Carbon::now()->startOfDay();
        $due = $task->due_date ? Carbon::parse($task->due_date)->startOfDay() : null;
        if (! $due && $task->planned_end) {
            $due = Carbon::parse($task->planned_end)->startOfDay();
        }

        $priorityPart = $this->priorityRiskPoints($task);
        $deadlinePart = $this->deadlineProximityPoints($now, $due);
        $schedulePart = $this->scheduleSlippagePoints($task, $now, $due);
        $dependencyPart = $this->dependencyRiskPoints($task);
        $score = (int) min(100, $priorityPart + $deadlinePart + $schedulePart + $dependencyPart);
        $level = $this->scoreToLevel($score);

        $factors = $this->riskFactorsFromPriorityAndDeadline($task, $now, $due);
        $factors = array_merge($factors, $this->scheduleRiskFactorStrings($task, $now, $due));
        $factors = array_merge($factors, $this->dependencyRiskFactorStrings($task));

        $factors = array_values(array_unique(array_filter($factors)));
        $result = [
            'risk_level' => $level,
            'risk_score' => $score,
            'factors' => $factors ?: ['Priorité et échéance sous contrôle'],
        ];

        if ($persist) {
            $this->persistRisk($task, $result);
        }

        return $result;
    }

    private function priorityRiskPoints(Task $task): int
    {
        return match ($task->priority) {
            'urgent' => 42,
            'high' => 32,
            'medium' => 18,
            'low' => 8,
            default => 14,
        };
    }

    /**
     * Proximité d’échéance (due_date ou planned_end) : retard ou jours restants.
     */
    private function deadlineProximityPoints(Carbon $now, ?Carbon $due): int
    {
        if (! $due) {
            return 0;
        }

        if ($now->gt($due)) {
            $overdueDays = max(1, (int) $due->diffInDays($now));

            return min(58, 28 + min(30, ($overdueDays - 1) * 4));
        }

        $daysLeft = (int) $now->diffInDays($due, false);
        if ($daysLeft <= 0) {
            return 36;
        }
        if ($daysLeft <= 2) {
            return 30;
        }
        if ($daysLeft <= 7) {
            return 16;
        }
        if ($daysLeft <= 14) {
            return 7;
        }

        return 0;
    }

    /**
     * Retard probable si la progression reste nettement sous une courbe linéaire (début → échéance).
     */
    private function scheduleSlippagePoints(Task $task, Carbon $now, ?Carbon $due): int
    {
        if ($due === null || $task->isCompleted()) {
            return 0;
        }
        if ($now->gt($due)) {
            return 0;
        }

        $start = $task->planned_start
            ? Carbon::parse($task->planned_start)->startOfDay()
            : ($task->created_at ? Carbon::parse($task->created_at)->startOfDay() : null);
        if ($start === null) {
            return 0;
        }

        $dueDay = $due->copy()->startOfDay();
        $totalSpan = max(1, (int) $start->diffInDays($dueDay));
        $elapsed = (int) min($totalSpan, max(0, $start->diffInDays($now->copy()->startOfDay())));
        if ($elapsed < 1) {
            return 0;
        }

        $p = (int) ($task->progress_percent ?? 0);
        $expectedProgress = (int) min(100, (int) round(100 * ($elapsed / $totalSpan)));
        if ($p + 12 < $expectedProgress) {
            $gap = $expectedProgress - $p;

            return min(24, 6 + (int) min(18, $gap / 4));
        }

        return 0;
    }

    /**
     * Dépendances non terminées : risque de blocage.
     */
    private function dependencyRiskPoints(Task $task): int
    {
        try {
            $count = $task->dependencies()
                ->where('progress_percent', '<', 100)
                ->count();
        } catch (\Throwable) {
            return 0;
        }

        return min(18, $count * 6);
    }

    /**
     * @return array<int, string>
     */
    private function scheduleRiskFactorStrings(Task $task, Carbon $now, ?Carbon $due): array
    {
        if ($due === null || $task->isCompleted() || $now->gt($due)) {
            return [];
        }
        $start = $task->planned_start
            ? Carbon::parse($task->planned_start)->startOfDay()
            : ($task->created_at ? Carbon::parse($task->created_at)->startOfDay() : null);
        if ($start === null) {
            return [];
        }
        $dueDay = $due->copy()->startOfDay();
        $totalSpan = max(1, (int) $start->diffInDays($dueDay));
        $elapsed = (int) min($totalSpan, max(0, $start->diffInDays($now->copy()->startOfDay())));
        if ($elapsed < 1) {
            return [];
        }
        $p = (int) ($task->progress_percent ?? 0);
        $expectedProgress = (int) min(100, (int) round(100 * ($elapsed / $totalSpan)));
        if ($p + 12 < $expectedProgress) {
            return ['Progression en retard par rapport au calendrier (trajectoire linéaire)'];
        }

        return [];
    }

    /**
     * @return array<int, string>
     */
    private function dependencyRiskFactorStrings(Task $task): array
    {
        try {
            $n = $task->dependencies()
                ->where('progress_percent', '<', 100)
                ->count();
        } catch (\Throwable) {
            return [];
        }
        if ($n > 0) {
            return [$n === 1
                ? 'Une dépendance non terminée peut bloquer cette tâche'
                : $n.' dépendances non terminées (risque de blocage)'];
        }

        return [];
    }

    /**
     * @return array<int, string>
     */
    private function riskFactorsFromPriorityAndDeadline(
        Task $task,
        Carbon $now,
        ?Carbon $due
    ): array {
        $factors = [];

        $factors[] = match ($task->priority) {
            'urgent' => 'Priorité urgente',
            'high' => 'Priorité haute',
            'medium' => 'Priorité moyenne',
            'low' => 'Priorité basse',
            default => 'Priorité non définie',
        };

        if (! $due) {
            $factors[] = 'Aucune échéance renseignée';

            return $factors;
        }

        if ($now->gt($due)) {
            $factors[] = 'Échéance dépassée';
        } else {
            $daysLeft = (int) $now->diffInDays($due, false);
            if ($daysLeft <= 2) {
                $factors[] = 'Échéance dans 2 jours ou moins';
            } elseif ($daysLeft <= 7) {
                $factors[] = 'Échéance dans la semaine';
            } elseif ($daysLeft <= 14) {
                $factors[] = 'Échéance sous deux semaines';
            }
        }

        return $factors;
    }

    /**
     * Meilleur membre du projet pour l’auto-assignation : score de charge minimal
     * (open_estimated_hours × 0,6) + (tâches actives × 0,3) + (tâches en retard × 0,1).
     */
    public function suggestBestUser(Task $task): ?int
    {
        $project = $task->project;
        if (! $project) {
            return null;
        }

        $ids = collect();

        if (Schema::hasTable('project_user')) {
            $ids = $ids->merge($project->users()->pluck('users.id'));
        }
        $ids = $ids->merge($project->members()->pluck('users.id'));
        if ($project->owner_id) {
            $ids->push($project->owner_id);
        }

        $unique = $ids->filter()->unique()->values();
        if ($unique->isEmpty()) {
            return null;
        }

        $adminIds = User::query()
            ->whereIn('id', $unique->all())
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $eligibleIds = $unique
            ->reject(fn ($id) => in_array((int) $id, $adminIds, true))
            ->values();

        if ($eligibleIds->isEmpty()) {
            return null;
        }

        $bestId = null;
        $bestScore = null;

        foreach ($eligibleIds as $uid) {
            $uid = (int) $uid;
            $score = $this->workloadCompositeScore($uid, (int) $project->id);

            if ($bestScore === null || $score < $bestScore || ($score === $bestScore && ($bestId === null || $uid < $bestId))) {
                $bestScore = $score;
                $bestId = $uid;
            }
        }

        return $bestId;
    }

    /**
     * Score de charge (plus bas = plus disponible) pour un membre dans un projet.
     */
    public function workloadCompositeScore(int $userId, int $projectId): float
    {
        $hours = $this->openEstimatedHoursForUserInProject($userId, $projectId);
        $active = $this->activeTaskCountForUserInProject($userId, $projectId);
        $overdue = $this->overdueTaskCountForUserInProject($userId, $projectId);

        return ($hours * 0.6) + ($active * 0.3) + ($overdue * 0.1);
    }

    /**
     * Somme des heures estimées des tâches non terminées du projet assignées à l’utilisateur.
     */
    public function openEstimatedHoursForUserInProject(int $userId, int $projectId): float
    {
        return (float) Task::query()
            ->where('project_id', $projectId)
            ->whereNull('archived_at')
            ->where('progress_percent', '<', 100)
            ->where(function ($q) {
                $q->whereNull('workflow_status')
                    ->orWhere('workflow_status', '!=', 'done');
            })
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->sum('estimated_hours');
    }

    protected function activeTaskCountForUserInProject(int $userId, int $projectId): int
    {
        return Task::query()
            ->where('project_id', $projectId)
            ->whereNull('archived_at')
            ->where('progress_percent', '<', 100)
            ->where(function ($q) {
                $q->whereNull('workflow_status')
                    ->orWhere('workflow_status', '!=', 'done');
            })
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->count();
    }

    /**
     * Tâches non terminées du projet assignées à l’utilisateur dont la date d’échéance / fin planifiée est dépassée (jour calendaire).
     */
    protected function overdueTaskCountForUserInProject(int $userId, int $projectId): int
    {
        $today = now()->toDateString();

        return Task::query()
            ->where('project_id', $projectId)
            ->whereNull('archived_at')
            ->where('progress_percent', '<', 100)
            ->where(function ($q) {
                $q->whereNull('workflow_status')
                    ->orWhere('workflow_status', '!=', 'done');
            })
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where(function ($q) use ($today) {
                $q->where(function ($q2) use ($today) {
                    $q2->whereNotNull('due_date')->whereDate('due_date', '<', $today);
                })->orWhere(function ($q2) use ($today) {
                    $q2->whereNotNull('planned_end')->whereDate('planned_end', '<', $today);
                });
            })
            ->count();
    }

    /**
     * Payload pour l’API d’estimation (règles métier).
     *
     * @return array<string, mixed>
     */
    public function buildEstimatePayload(Task $task): array
    {
        $mins = $this->estimateTaskDuration($task);
        $hours = round($mins / 60, 2);
        $n = $this->similarTasksSampleCount($task);
        $detail = $this->comparableTasksEstimateDetail($task);

        return [
            'task_id' => $task->id,
            'title' => $task->title,
            'estimated_hours' => $hours,
            'estimated_duration' => $mins,
            'estimated_duration_minutes' => $mins,
            'estimated_days' => max(1, round($hours / 8, 1)),
            'method' => 'rule_based',
            'confidence' => round(min(0.92, 0.42 + max($n, count($detail['comparable_tasks'])) * 0.05), 2),
            'sample_size' => $n,
            'comparable_tasks' => $detail['comparable_tasks'],
            'comparable_range' => $detail['comparable_range'],
            'average_completion_time_days' => $detail['average_completion_time_days'],
        ];
    }

    /**
     * @return array{comparable_tasks: array<int, array<string, mixed>>, comparable_range: ?array{min: float, max: float}, average_completion_time_days: ?float}
     */
    private function comparableTasksEstimateDetail(Task $task): array
    {
        $c = (int) ($task->complexity ?? 5);
        $rows = Task::query()
            ->where('project_id', $task->project_id)
            ->where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('actual_hours')
            ->where('actual_hours', '>', 0)
            ->orderByDesc('updated_at')
            ->limit(40)
            ->get()
            ->filter(fn (Task $t) => abs((int) $t->complexity - $c) <= 2)
            ->take(5);

        $comparable = [];
        $daysSamples = [];
        foreach ($rows as $t) {
            $days = null;
            if ($t->created_at && $t->updated_at) {
                $days = max(0.5, $t->created_at->diffInDays($t->updated_at));
                $daysSamples[] = $days;
            }
            $comparable[] = [
                'id' => $t->id,
                'title' => $t->title,
                'actual_hours' => round((float) $t->actual_hours, 2),
                'completion_days' => $days !== null ? round($days, 1) : null,
            ];
        }

        $hoursList = collect($comparable)->pluck('actual_hours')->filter();
        $range = $hoursList->isEmpty()
            ? null
            : ['min' => round((float) $hoursList->min(), 2), 'max' => round((float) $hoursList->max(), 2)];

        $avgDays = count($daysSamples) > 0 ? round(array_sum($daysSamples) / count($daysSamples), 1) : null;

        return [
            'comparable_tasks' => $comparable,
            'comparable_range' => $range,
            'average_completion_time_days' => $avgDays,
        ];
    }

    /**
     * Analyse des risques pour toutes les tâches actives d’un projet.
     *
     * @return array{summary: array<string, int>, tasks: array<int, array<string, mixed>>}
     */
    public function analyzeProject(Project $project): array
    {
        $tasks = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->with('assignees')
            ->get();

        $results = [];
        foreach ($tasks as $task) {
            $analysis = $this->detectTaskRisk($task, false);
            if ($analysis['risk_score'] <= 0) {
                continue;
            }
            $results[] = [
                'task_id' => $task->id,
                'title' => $task->title,
                'priority' => $task->priority,
                'due_date' => $task->due_date?->toDateString(),
                'progress' => $task->progress_percent,
                'progress_percent' => $task->progress_percent,
                'risk_score' => $analysis['risk_score'],
                'risk_level' => $analysis['risk_level'],
                'risk_factors' => $this->mapFactorsForApi($analysis['factors']),
                'recommendations' => $this->riskRecommendations($analysis['risk_level']),
            ];
        }

        usort($results, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        $byLevel = collect($results)->groupBy('risk_level')->map->count();

        $summary = [
            'total_analyzed' => $tasks->count(),
            'at_risk' => count($results),
            'critical' => 0,
            'high' => (int) ($byLevel['high'] ?? 0),
            'medium' => (int) ($byLevel['medium'] ?? 0),
            'low' => (int) ($byLevel['low'] ?? 0),
        ];

        return [
            'summary' => $summary,
            'tasks' => $results,
        ];
    }

    /**
     * Suggestions d’assignation pour les tâches non assignées.
     *
     * @return array{unassigned_count: int, assignments: array<int, array<string, mixed>>}
     */
    public function buildOptimizeAssignmentsPayload(Project $project): array
    {
        $unassigned = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->whereDoesntHave('assignees')
            ->orderByDesc('priority')
            ->orderByDesc('complexity')
            ->get();

        $assignments = [];
        foreach ($unassigned as $task) {
            $task->load('assignees');
            $detail = $this->suggestAssignmentDetails($task);
            $assignments[] = [
                'task_id' => $task->id,
                'task' => ['title' => $task->title],
                'user_id' => $detail['suggested_user_id'],
                'suggested_user' => $detail['suggested_user'],
                'score' => $detail['score'],
                'workload_score' => $detail['workload_score'] ?? null,
            ];
        }

        return [
            'unassigned_count' => $unassigned->count(),
            'assignments' => $assignments,
        ];
    }

    /**
     * @return array{suggested_user_id: ?int, suggested_user: ?array, score: ?int}
     */
    public function suggestAssignmentDetails(Task $task): array
    {
        $bestId = $this->suggestBestUser($task);
        if ($bestId === null) {
            return [
                'suggested_user_id' => null,
                'suggested_user' => null,
                'score' => null,
            ];
        }

        $raw = $this->computeUserAssignmentScore($bestId);
        $user = User::query()->find($bestId);
        $projectId = (int) $task->project_id;
        $workload = $this->workloadCompositeScore($bestId, $projectId);

        return [
            'suggested_user_id' => $bestId,
            'suggested_user' => $user
                ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]
                : null,
            'score' => (int) round(min(100, max(0, $raw))),
            'workload_score' => round($workload, 4),
        ];
    }

    /**
     * Charge ouverte par membre dans un projet (pour expliquer l’auto-assignation).
     * suggestBestUser() minimise workload_score : (heures ouvertes × 0,6) + (tâches actives × 0,3) + (en retard × 0,1).
     *
     * @return array{user_id: int, project_id: int, active_tasks: int, open_estimated_hours: float}
     */
    public function memberWorkloadMetrics(int $userId, int $projectId): array
    {
        $activeTasks = Task::query()
            ->where('project_id', $projectId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('progress_percent', '<', 100)
            ->count();

        $hours = Task::query()
            ->where('project_id', $projectId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('progress_percent', '<', 100)
            ->sum('estimated_hours');

        return [
            'user_id' => $userId,
            'project_id' => $projectId,
            'active_tasks' => $activeTasks,
            'open_estimated_hours' => round((float) $hours, 2),
            'workload_score' => round($this->workloadCompositeScore($userId, $projectId), 4),
        ];
    }

    /**
     * Métriques IA pour le tableau de bord projet.
     *
     * @return array<string, mixed>
     */
    public function projectDashboardInsights(Project $project): array
    {
        $tasks = $project->tasks()->with('assignees')->get();
        $active = $tasks->filter(fn (Task $t) => ! $t->isCompleted());

        $atRisk = $active->filter(function (Task $t) {
            $r = $this->detectTaskRisk($t, false);

            return in_array($r['risk_level'], ['high', 'medium'], true);
        });

        $memberIds = $project->members()->pluck('users.id');
        if ($project->owner_id) {
            $memberIds = $memberIds->push($project->owner_id);
        }
        $memberIds = $memberIds->unique()->filter()->values();

        $workload = [];
        foreach ($memberIds as $uid) {
            $u = User::query()->find($uid);
            if (! $u) {
                continue;
            }
            $workload[] = [
                'user_id' => (int) $uid,
                'name' => $u->name,
                'active_tasks' => Task::query()
                    ->where('project_id', $project->id)
                    ->whereHas('assignees', fn ($q) => $q->where('users.id', $uid))
                    ->where('progress_percent', '<', 100)
                    ->count(),
            ];
        }
        usort($workload, fn ($a, $b) => $b['active_tasks'] <=> $a['active_tasks']);

        $est = (float) $tasks->sum(fn (Task $t) => $t->effectiveEstimatedHours());
        $act = (float) $tasks
            ->filter(fn (Task $t) => $t->isCompleted())
            ->sum(fn (Task $t) => (float) ($t->actual_hours ?? 0));

        return [
            'ai_tasks_at_risk' => $atRisk->count(),
            'workload_by_member' => $workload,
            'estimated_hours_total' => round($est, 1),
            'actual_hours_total' => round($act, 1),
        ];
    }

    /**
     * Réponse API « risque retard » pour une tâche (facteurs structurés pour l’UI).
     *
     * @return array<string, mixed>
     */
    public function buildDelayRiskTaskPayload(Task $task): array
    {
        $analysis = $this->detectTaskRisk($task, false);

        return [
            'risk_score' => $analysis['risk_score'],
            'risk_level' => $analysis['risk_level'],
            'delay_probability_percent' => $analysis['risk_score'],
            'schedule_health' => match ($analysis['risk_level']) {
                'high' => 'critical',
                'medium' => 'watch',
                default => 'ok',
            },
            'risk_factors' => $this->mapFactorsForApi($analysis['factors']),
            'recommendations' => $this->riskRecommendations($analysis['risk_level']),
            'insights' => $this->delayRiskInsights($task, $analysis),
        ];
    }

    /**
     * @param  array{risk_level: string, risk_score: int, factors: array<int, string>}  $analysis
     * @return array<int, string>
     */
    private function delayRiskInsights(Task $task, array $analysis): array
    {
        $lines = [];
        $estH = (float) ($task->estimated_hours ?? 0);
        if ($estH > 0 && ! $task->isCompleted()) {
            $rem = max(0, 100 - (int) ($task->progress_percent ?? 0)) / 100 * $estH;
            $lines[] = 'Reste à produire (estimation) : environ '.round($rem, 1).' h.';
        }
        if ($analysis['risk_score'] >= 60) {
            $lines[] = 'Retard probable sans action : prioriser ou découper la tâche.';
        } elseif ($analysis['risk_score'] >= 30) {
            $lines[] = 'Surveiller les dépendances et la charge de l’assigné.';
        }

        return array_slice($lines, 0, 4);
    }

    /**
     * Équilibre de charge par membre sur un projet (répartition des tâches).
     *
     * @return array<string, mixed>
     */
    public function buildWorkloadBalancePayload(Project $project): array
    {
        $ids = collect();
        if (Schema::hasTable('project_user')) {
            $ids = $ids->merge($project->users()->pluck('users.id'));
        }
        $ids = $ids->merge($project->members()->pluck('users.id'));
        if ($project->owner_id) {
            $ids->push($project->owner_id);
        }
        $unique = $ids->filter()->unique()->values();

        $members = [];
        foreach ($unique as $uid) {
            $uid = (int) $uid;
            $u = User::query()->find($uid);
            if (! $u) {
                continue;
            }
            $score = $this->workloadCompositeScore($uid, (int) $project->id);
            $hours = $this->openEstimatedHoursForUserInProject($uid, (int) $project->id);
            $active = $this->activeTaskCountForUserInProject($uid, (int) $project->id);
            $overdue = $this->overdueTaskCountForUserInProject($uid, (int) $project->id);
            $members[] = [
                'user_id' => $uid,
                'name' => $u->name,
                'email' => $u->email,
                'workload_score' => round($score, 4),
                'open_estimated_hours' => round($hours, 2),
                'active_tasks' => $active,
                'overdue_tasks' => $overdue,
            ];
        }

        usort($members, fn ($a, $b) => $b['workload_score'] <=> $a['workload_score']);

        $scores = array_column($members, 'workload_score');
        $avg = count($scores) ? array_sum($scores) / count($scores) : 0.0;
        $variance = 0.0;
        foreach ($scores as $s) {
            $variance += ($s - $avg) ** 2;
        }
        $std = count($scores) > 1 ? sqrt($variance / count($scores)) : 0.0;

        return [
            'project_id' => $project->id,
            'members' => $members,
            'balance_metrics' => [
                'average_workload_score' => round($avg, 4),
                'spread' => round($std, 4),
                'imbalanced' => $std > 1.25 && count($members) > 1,
            ],
            'rebalance_hints' => $this->workloadRebalanceHints($members, $avg),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $members
     * @return array<int, string>
     */
    private function workloadRebalanceHints(array $members, float $avg): array
    {
        if ($members === []) {
            return [];
        }
        $hints = [];
        foreach ($members as $m) {
            if (($m['workload_score'] ?? 0) > $avg + 1.2) {
                $hints[] = 'Charge élevée pour '.$m['name'].' : envisager de réassigner des tâches non démarrées ou d’étaler les livrables.';
            }
        }
        if ($hints === [] && count($members) > 1) {
            $hints[] = 'Répartition globalement cohérente. Les suggestions d’assignation privilégient les membres avec le score de charge le plus bas.';
        }

        return array_slice($hints, 0, 6);
    }

    /**
     * Score d’assignation (0–100) : pénalise la charge (tâches actives globales) et l’historique de retard.
     */
    private function computeUserAssignmentScore(int $userId): float
    {
        $workload = $this->activeTaskCountForUser($userId);
        $delayed = $this->delayedCompletedHistoryCount($userId);
        $completed = $this->completedTaskCount($userId);

        $workloadPenalty = min(50, $workload * 5);
        $perf = $completed > 0
            ? max(0, 50 - min(50, $delayed * 8))
            : 25.0;

        return $perf + (50 - $workloadPenalty);
    }

    /**
     * @param  array<int, string>  $factors
     * @return array<int, array{factor: string, detail: string, impact: string}>
     */
    private function mapFactorsForApi(array $factors): array
    {
        return array_values(array_map(fn (string $detail) => [
            'factor' => 'rule',
            'detail' => $detail,
            'impact' => 'medium',
        ], $factors));
    }

    private function riskRecommendations(string $level): array
    {
        return match ($level) {
            'high' => [
                'Prioriser ou replanifier cette tâche.',
                'Vérifier les blocages et la charge des assignés.',
            ],
            'medium' => [
                'Surveiller l’avancement et anticiper les dépendances.',
            ],
            default => ['Maintenir le rythme actuel.'],
        };
    }

    private function similarTasksSampleCount(Task $task): int
    {
        $c = (int) ($task->complexity ?? 5);

        return (int) Task::query()
            ->where('project_id', $task->project_id)
            ->where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('actual_hours')
            ->where('actual_hours', '>', 0)
            ->get()
            ->filter(fn (Task $t) => abs((int) $t->complexity - $c) <= 2)
            ->count();
    }

    /**
     * Applique estimation + risque après création, assignation optionnelle.
     *
     * @return array{suggested_user_id: ?int, estimated_duration: int, risk: array}
     */
    public function applyOnTaskCreate(Task $task, bool $autoAssign): array
    {
        $task->refresh();

        if ($task->estimated_hours === null || (float) $task->estimated_hours <= 0) {
            $mins = $this->estimateTaskDuration($task);
            $task->estimated_duration = $mins;
            $task->estimated_hours = round($mins / 60, 2);
        } else {
            $task->estimated_duration = (int) round((float) $task->estimated_hours * 60);
        }

        $task->saveQuietly();

        $risk = $this->detectTaskRisk($task->fresh(), persist: true);

        $suggestedId = $this->suggestBestUser($task->fresh());

        if ($autoAssign && $suggestedId && $task->assignees()->count() === 0) {
            $task->assignees()->attach($suggestedId, [
                'allocation_percent' => 100,
                'assigned_at' => now(),
            ]);
            $task->load('assignees');
            $this->detectTaskRisk($task->fresh(), persist: true);
        }

        return [
            'suggested_user_id' => $suggestedId,
            'estimated_duration' => (int) $task->estimated_duration,
            'risk' => $risk,
        ];
    }

    public function refreshRiskAfterUpdate(Task $task): void
    {
        $this->detectTaskRisk($task->fresh(), persist: true);
    }

    private function persistRisk(Task $task, array $result): void
    {
        $task->forceFill([
            'risk_level' => $result['risk_level'],
            'risk_score' => $result['risk_score'],
        ])->saveQuietly();
    }

    private function scoreToLevel(int $score): string
    {
        return match (true) {
            $score >= 60 => 'high',
            $score >= 30 => 'medium',
            default => 'low',
        };
    }

    private function similarTasksAverageHours(Task $task): ?float
    {
        $c = (int) ($task->complexity ?? 5);

        $q = Task::query()
            ->where('project_id', $task->project_id)
            ->where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('actual_hours')
            ->where('actual_hours', '>', 0);

        $rows = $q->get()->filter(fn (Task $t) => abs((int) $t->complexity - $c) <= 2);

        if ($rows->isEmpty()) {
            return null;
        }

        return (float) $rows->avg('actual_hours');
    }

    private function activeTaskCountForUser(int $userId): int
    {
        return Task::query()
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('progress_percent', '<', 100)
            ->count();
    }

    private function delayedCompletedHistoryCount(int $userId): int
    {
        return Task::query()
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('progress_percent', 100)
            ->whereNotNull('due_date')
            ->whereNotNull('planned_end')
            ->whereColumn('planned_end', '>', 'due_date')
            ->count();
    }

    private function completedTaskCount(int $userId): int
    {
        return Task::query()
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('progress_percent', 100)
            ->count();
    }
}
