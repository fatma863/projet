<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\AIService;
use App\Services\AI\ProjectRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Dashboard dédié au rôle « client / viewer ».
 *
 * Fournit une vue synthétique par projet : avancement, deadline,
 * alertes, activité récente, rapports IA (lecture seule).
 */
class ClientDashboardController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
        private readonly ProjectRecommendationService $recommendationService,
    ) {}

    /**
     * GET /client/projects/{project}/report
     *
     * Rapport complet pour le client : avancement, risques,
     * recommandations IA, timeline, équipe.
     */
    public function projectReport(Project $project): JsonResponse
    {
        $project->loadCount(['tasks', 'members']);
        $project->load([
            'members:id,name,email',
            'tasks' => fn ($q) => $q->select([
                'id', 'project_id', 'title', 'priority', 'workflow_status',
                'progress_percent', 'due_date', 'planned_start', 'planned_end',
                'created_at',
            ]),
        ]);

        $tasks = $project->tasks;
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('workflow_status', 'done')->count();
        $inProgressTasks = $tasks->where('workflow_status', 'in_progress')->count();
        $todoTasks = $tasks->where('workflow_status', 'todo')->count();
        $atRiskTasks = $tasks->where('workflow_status', 'at_risk')->count();
        $overdueTasks = $tasks->filter(fn ($t) => $t->due_date && $t->due_date->isPast() && $t->workflow_status !== 'done')->count();

        $avgProgress = $totalTasks > 0 ? round($tasks->avg('progress_percent'), 1) : 0;

        // Deadline estimée = dernière date de fin connue
        $latestDeadline = $tasks
            ->map(fn ($t) => $t->due_date ?? $t->planned_end)
            ->filter()
            ->max();

        // Alertes
        $alerts = [];
        if ($overdueTasks > 0) {
            $alerts[] = [
                'type' => 'danger',
                'message' => "$overdueTasks tâche(s) en retard",
            ];
        }
        if ($atRiskTasks > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "$atRiskTasks tâche(s) à risque",
            ];
        }
        $blockedCount = 0; // Calculé au niveau du dashboard membre si nécessaire
        if ($blockedCount > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "$blockedCount tâche(s) bloquée(s)",
            ];
        }
        if (count($alerts) === 0) {
            $alerts[] = [
                'type' => 'success',
                'message' => 'Tout est en bonne voie.',
            ];
        }

        // Activités récentes (5 dernières)
        $recentActivities = $project->activityLogs()
            ->with('actor:id,name')
            ->latest()
            ->limit(5)
            ->get(['id', 'project_id', 'actor_id', 'action', 'meta', 'created_at'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'description' => $a->meta['description'] ?? $a->action,
                'user' => $a->actor?->name ?? 'Système',
                'date' => $a->created_at?->toIso8601String(),
            ]);

        // Équipe (noms + rôles projet)
        $team = $project->members->map(fn ($m) => [
            'id' => $m->id,
            'name' => $m->name,
            'role' => $m->pivot->project_role ?? 'member',
        ]);

        // Rapport IA — risques
        $aiRiskAnalysis = null;
        try {
            $analysis = $this->aiService->analyzeProject($project);
            $aiRiskAnalysis = [
                'summary' => $analysis['summary'] ?? null,
                'delay_probability' => $this->estimateProjectDelayProbability($tasks),
                'schedule_health' => $this->assessScheduleHealth($avgProgress, $overdueTasks, $totalTasks),
            ];
        } catch (\Throwable) {
            // Silencieusement ignorer en cas d'erreur IA
        }

        // Recommandations IA
        $aiRecommendations = null;
        try {
            $recommendations = $this->recommendationService->recommend($project);
            $aiRecommendations = $recommendations;
        } catch (\Throwable) {
            // Silencieusement ignorer
        }

        // Distribution des tâches
        $taskDistribution = [
            ['label' => 'Terminées', 'value' => $completedTasks, 'color' => '#10b981'],
            ['label' => 'En cours', 'value' => $inProgressTasks, 'color' => '#3b82f6'],
            ['label' => 'À faire', 'value' => $todoTasks, 'color' => '#94a3b8'],
            ['label' => 'À risque', 'value' => $atRiskTasks, 'color' => '#f59e0b'],
            ['label' => 'En retard', 'value' => $overdueTasks, 'color' => '#ef4444'],
        ];

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
            ],
            'progress' => $avgProgress,
            'estimated_deadline' => $latestDeadline,
            'alerts' => $alerts,
            'stats' => [
                'total_tasks' => $totalTasks,
                'completed' => $completedTasks,
                'in_progress' => $inProgressTasks,
                'todo' => $todoTasks,
                'at_risk' => $atRiskTasks,
                'overdue' => $overdueTasks,
            ],
            'task_distribution' => $taskDistribution,
            'team' => $team,
            'recent_activities' => $recentActivities,
            'ai_risk_analysis' => $aiRiskAnalysis,
            'ai_recommendations' => $aiRecommendations,
        ]);
    }

    /**
     * Estime la probabilité globale de retard du projet (heuristique simple).
     */
    private function estimateProjectDelayProbability($tasks): int
    {
        if ($tasks->isEmpty()) {
            return 0;
        }

        $total = $tasks->count();
        $overdue = $tasks->filter(fn ($t) => $t->due_date && $t->due_date->isPast() && $t->workflow_status !== 'done')->count();
        $atRisk = $tasks->where('workflow_status', 'at_risk')->count();

        $ratio = ($overdue * 2 + $atRisk) / max($total, 1);

        return min(100, (int) round($ratio * 100));
    }

    /**
     * Évalue la santé du planning.
     */
    private function assessScheduleHealth(float $progress, int $overdue, int $total): string
    {
        if ($total === 0) {
            return 'ok';
        }
        $overdueRatio = $overdue / $total;
        if ($overdueRatio > 0.3) {
            return 'critical';
        }
        if ($overdueRatio > 0.1 || $progress < 30) {
            return 'watch';
        }

        return 'ok';
    }
}
