<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\CriticalPathService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CriticalPathController extends Controller
{
    public function index(Request $request, Project $project, CriticalPathService $criticalPathService): JsonResponse
    {
        Gate::authorize('view', $project);

        $data = $criticalPathService->analyzeProject($project);
        $data['schedule_ready'] = $project->tasks()->whereNotNull('planned_start')->exists();

        return response()->json($data);
    }
}
