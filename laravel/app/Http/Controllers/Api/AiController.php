<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AI\OpenRouterService;
use App\Services\AI\ProjectRecommendationService;
use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AiController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
        private readonly ProjectRecommendationService $projectRecommendationService,
        private readonly OpenRouterService $llm,
    ) {}

    public function estimateTask(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $payload = $this->aiService->buildEstimatePayload($task);

        return response()->json($payload);
    }

    public function delayRiskTask(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $payload = $this->aiService->buildDelayRiskTaskPayload($task);

        return response()->json([
            'task_id' => $task->id,
            'title'   => $task->title,
            ...$payload,
        ]);
    }

    public function delayRiskProject(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json($this->aiService->analyzeProject($project));
    }

    public function suggestAssignment(Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $detail = $this->aiService->suggestAssignmentDetails($task);

        return response()->json([
            'task_id'      => $task->id,
            'title'        => $task->title,
            'suggested_user' => $detail['suggested_user'],
            'score'          => $detail['score'],
            'workload_score' => $detail['workload_score'] ?? null,
            'ai_powered'     => $this->llm->isAvailable(),
        ]);
    }

    public function optimizeProjectAssignments(Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        return response()->json($this->aiService->buildOptimizeAssignmentsPayload($project));
    }

    public function projectRecommendations(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json($this->projectRecommendationService->recommend($project));
    }

    public function workloadBalance(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json($this->aiService->buildWorkloadBalancePayload($project));
    }

    /**
     * Assistant conversationnel : pose une question libre sur un projet ou une tâche.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'    => 'required|string|max:2000',
            'project_id' => 'nullable|integer|exists:projects,id',
        ]);

        $projectContext = [];
        if (! empty($validated['project_id'])) {
            $project = Project::with(['members', 'tasks'])->find($validated['project_id']);
            if ($project) {
                Gate::authorize('view', $project);
                $tasks = $project->tasks;
                $active = $tasks->where('progress_percent', '<', 100);
                $overdue = $active->filter(fn ($t) => $t->due_date && $t->due_date->isPast());
                $projectContext = [
                    'name'         => $project->name,
                    'description'  => mb_substr((string) ($project->description ?? ''), 0, 200),
                    'status'       => $project->status,
                    'total_tasks'  => $tasks->count(),
                    'active_tasks' => $active->count(),
                    'overdue_tasks' => $overdue->count(),
                    'members'      => $project->members->pluck('name')->values()->toArray(),
                    'completion_percent' => $tasks->count() > 0
                        ? round($tasks->avg('progress_percent'), 1)
                        : 0,
                ];
            }
        }

        if (! $this->llm->isAvailable()) {
            return response()->json([
                'response'   => 'L\'assistant IA n\'est pas configuré. Veuillez définir OPENROUTER_API_KEY dans le fichier .env.',
                'ai_powered' => false,
            ]);
        }

        $response = $this->llm->askAboutProject($validated['message'], $projectContext);

        return response()->json([
            'response'   => $response,
            'ai_powered' => true,
        ]);
    }
}
