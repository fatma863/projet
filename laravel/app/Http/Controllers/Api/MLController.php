<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\ML\PythonMLClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MLController extends Controller
{
    public function __construct(
        private PythonMLClient $ml,
    ) {}

    /**
     * POST /api/ml/recommend
     */
    public function recommendForNewTask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'      => 'required|integer|exists:projects,id',
            'priority'        => 'nullable|in:low,medium,high,urgent',
            'issue_type'      => 'nullable|in:task,bug,story',
            'complexity'      => 'nullable|integer|min:1|max:10',
            'story_points'    => 'nullable|integer',
            'estimated_hours' => 'nullable|numeric|min:0',
            'planned_end'     => 'nullable|date',
            'sprint_id'       => 'nullable|integer',
            'specialty_ids'   => 'nullable|array',
            'specialty_ids.*' => 'integer|exists:specialties,id',
            'top_n'           => 'nullable|integer|min:1|max:10',
        ]);

        $result = $this->ml->recommendForNewTask(
            $data,
            (int)$data['project_id'],
            (int)($data['top_n'] ?? 5)
        );

        return response()->json($result);
    }

    /**
     * GET /api/ml/recommend/{task}
     */
    public function recommend(Request $request, Task $task): JsonResponse
    {
        $topN   = (int)$request->query('top_n', 5);
        $result = $this->ml->recommend($task, null, $topN);

        return response()->json($result);
    }

    /**
     * GET /api/ml/model-info
     */
    public function modelInfo(): JsonResponse
    {
        return response()->json($this->ml->modelInfo());
    }

    /**
     * POST /api/ml/retrain  (admin only)
     */
    public function retrain(): JsonResponse
    {
        $metrics = $this->ml->retrain();

        if (in_array($metrics['status'] ?? '', ['error', 'insufficient_data'])) {
            return response()->json($metrics, 422);
        }

        return response()->json($metrics);
    }

    /**
     * POST /api/ml/feedback/{task}
     */
    public function recordOutcome(Task $task): JsonResponse
    {
        $this->ml->recordOutcome($task);
        return response()->json(['status' => 'recorded']);
    }
}
