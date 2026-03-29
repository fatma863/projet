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
        $minutes = self::BASE_MINUTES;

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
        $task->loadMissing('assignees');

        $score = 0;
        $factors = [];

        $now = Carbon::now()->startOfDay();
        $due = $task->due_date ? Carbon::parse($task->due_date)->startOfDay() : null;

        if ($task->progress_percent >= 100) {
            $result = ['risk_level' => 'low', 'risk_score' => 0, 'factors' => ['Tâche terminée']];
            if ($persist) {
                $this->persistRisk($task, $result);
            }

            return $result;
        }

        if ($due && $task->progress_percent < 100) {
            if ($now->gt($due)) {
                $days = $now->diffInDays($due);
                $score += min(55, 35 + (int) $days * 3);
                $factors[] = 'Échéance dépassée';
            } elseif ($due->isFuture() && $now->diffInDays($due) <= 2) {
                $score += 28;
                $factors[] = 'Échéance dans moins de 2 jours';
            }
        }

        $assignees = $task->assignees;
        if ($assignees->isEmpty()) {
            $score += 12;
            $factors[] = 'Aucun assigné';
        }

        foreach ($assignees as $user) {
            $active = $this->activeTaskCountForUser($user->id);
            if ($active >= 8) {
                $score += 22;
                $factors[] = 'Charge élevée pour un assigné ('.$active.' tâches actives)';
                break;
            }
            if ($active >= 5) {
                $score += 12;
                $factors[] = 'Charge importante ('.$active.' tâches actives)';
                break;
            }
        }

        foreach ($assignees as $user) {
            $delayed = $this->delayedCompletedHistoryCount($user->id);
            if ($delayed >= 5) {
                $score += 18;
                $factors[] = 'Historique de retards fréquents pour un assigné';
                break;
            }
            if ($delayed >= 2) {
                $score += 8;
                $factors[] = 'Quelques retards passés sur les tâches terminées';
                break;
            }
        }

        $score = (int) min(100, max(0, $score));
        $level = $this->scoreToLevel($score);

        $result = [
            'risk_level' => $level,
            'risk_score' => $score,
            'factors' => $factors ?: ['Aucun signal critique'],
        ];

        if ($persist) {
            $this->persistRisk($task, $result);
        }

        return $result;
    }

    /**
     * Meilleur utilisateur pour assigner la tâche (score simple charge + perf).
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

        $bestId = null;
        $bestScore = -1.0;

        foreach ($unique as $uid) {
            $s = $this->computeUserAssignmentScore((int) $uid);
            if ($s > $bestScore) {
                $bestScore = $s;
                $bestId = (int) $uid;
            }
        }

        return $bestId;
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

        return [
            'task_id' => $task->id,
            'title' => $task->title,
            'estimated_hours' => $hours,
            'estimated_duration' => $mins,
            'estimated_duration_minutes' => $mins,
            'estimated_days' => max(1, round($hours / 8, 1)),
            'method' => 'rule_based',
            'confidence' => round(min(0.88, 0.42 + $n * 0.06), 2),
            'sample_size' => $n,
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

        return [
            'suggested_user_id' => $bestId,
            'suggested_user' => $user
                ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]
                : null,
            'score' => (int) round(min(100, max(0, $raw))),
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
        $active = $tasks->where('progress_percent', '<', 100);

        $atRisk = $active->filter(function (Task $t) {
            if (in_array($t->risk_level, ['high', 'medium'], true)) {
                return true;
            }
            if ($t->risk_level === null && $t->isOverdue()) {
                return true;
            }

            return false;
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

        $est = (float) $tasks->sum(fn (Task $t) => (float) ($t->estimated_hours ?? 0));
        $act = (float) $tasks->sum(fn (Task $t) => (float) ($t->actual_hours ?? 0));

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
            'risk_factors' => $this->mapFactorsForApi($analysis['factors']),
            'recommendations' => $this->riskRecommendations($analysis['risk_level']),
        ];
    }

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
