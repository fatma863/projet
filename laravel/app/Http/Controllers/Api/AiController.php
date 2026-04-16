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
     * Assistant conversationnel : pose une question libre sur tous les projets/tâches.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'    => 'required|string|max:2000',
            'project_id' => 'nullable|integer|exists:projects,id',
        ]);

        if (! $this->llm->isAvailable()) {
            return response()->json([
                'response'   => 'L\'assistant IA n\'est pas configuré. Veuillez définir OPENROUTER_API_KEY dans le fichier .env.',
                'ai_powered' => false,
            ]);
        }

        $user = $request->user();

        // Collect all project IDs the user can access (owner + both pivot tables)
        $projectIds = collect()
            ->merge($user->projects()->pluck('projects.id'))
            ->merge($user->accessibleProjects()->pluck('projects.id'))
            ->merge($user->ownedProjects()->pluck('id'))
            ->unique()
            ->values();

        // Load all projects with tasks and members (compact fields only)
        $allProjects = Project::whereIn('id', $projectIds)
            ->with([
                'tasks:id,project_id,title,priority,workflow_status,due_date,progress_percent',
                'members:id,name',
            ])
            ->get(['id', 'name', 'status']);

        // Build per-project summaries
        $projectsSummary = $allProjects->map(function ($p) {
            $tasks = $p->tasks;
            $open  = $tasks->where('workflow_status', '!=', 'done');
            return [
                'id'             => $p->id,
                'name'           => $p->name,
                'status'         => $p->status,
                'completion'     => $tasks->count() > 0 ? round($tasks->avg('progress_percent'), 0).'%' : '0%',
                'members'        => $p->members->pluck('name')->values()->toArray(),
                'total_tasks'    => $tasks->count(),
                'done'           => $tasks->where('workflow_status', 'done')->count(),
                'in_progress'    => $tasks->where('workflow_status', 'in_progress')->count(),
                'at_risk'        => $tasks->where('workflow_status', 'at_risk')->count(),
                'overdue'        => $open->filter(fn ($t) => $t->due_date && $t->due_date->isPast())->count(),
            ];
        })->values()->toArray();

        // User's own assigned tasks across all projects (open only, max 30)
        $myTasks = $user->assignedTasks()
            ->with('project:id,name')
            ->whereIn('tasks.workflow_status', ['todo', 'in_progress', 'at_risk'])
            ->orderBy('tasks.due_date')
            ->limit(30)
            ->get(['tasks.id', 'tasks.project_id', 'tasks.title', 'tasks.priority',
                   'tasks.workflow_status', 'tasks.due_date', 'tasks.progress_percent'])
            ->map(fn ($t) => [
                'title'    => $t->title,
                'project'  => $t->project?->name,
                'priority' => $t->priority,
                'status'   => $t->workflow_status,
                'due'      => $t->due_date?->format('Y-m-d'),
                'progress' => $t->progress_percent.'%',
            ])->values()->toArray();

        $context = [
            'current_user'    => $user->name,
            'total_projects'  => $allProjects->count(),
            'projects'        => $projectsSummary,
            'my_assigned_tasks' => $myTasks,
        ];

        // If a specific project is focused, append its full task list
        if (! empty($validated['project_id'])) {
            $focused = $allProjects->firstWhere('id', (int) $validated['project_id']);
            if ($focused) {
                $context['focused_project'] = $focused->name;
                $context['focused_project_tasks'] = $focused->tasks->map(fn ($t) => [
                    'title'    => $t->title,
                    'priority' => $t->priority,
                    'status'   => $t->workflow_status,
                    'due'      => $t->due_date?->format('Y-m-d'),
                    'progress' => $t->progress_percent.'%',
                ])->values()->toArray();
            }
        }

        $response = $this->llm->askAboutProject($validated['message'], $context);

        return response()->json([
            'response'   => $response,
            'ai_powered' => true,
        ]);
    }
}
