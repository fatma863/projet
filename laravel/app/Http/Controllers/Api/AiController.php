<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AI\ProjectRecommendationService;
use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AiController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
        private readonly ProjectRecommendationService $projectRecommendationService,
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
            'title' => $task->title,
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
            'task_id' => $task->id,
            'title' => $task->title,
            'suggested_user' => $detail['suggested_user'],
            'score' => $detail['score'],
            'workload_score' => $detail['workload_score'] ?? null,
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
}
