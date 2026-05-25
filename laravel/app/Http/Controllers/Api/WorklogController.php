<?php

namespace App\Http\Controllers\Api;

use App\Events\ProgressUpdated;
use App\Http\Controllers\Controller;
use App\Models\DailyTaskProgress;
use App\Models\Task;
use App\Services\ProgressCalculationService;
use App\Services\ProjectProgressAggregator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WorklogController extends Controller
{
    public function __construct(
        private ProgressCalculationService $progressService,
        private ProjectProgressAggregator  $aggregator,
    ) {}

    /**
     * GET /tasks/{task}/worklog
     * History of worklog entries for this task (paginated, newest first).
     */
    public function index(Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($task);

        $entries = DailyTaskProgress::where('task_id', $task->id)
            ->with('user:id,name,email')
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json($entries);
    }

    /**
     * POST /tasks/{task}/worklog
     * Log work for today (or a given date). Upserts per user+date.
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'worked_minutes' => 'required|integer|min:1|max:1440',
            'progress_delta' => 'required|integer|min:-100|max:100',
            'note'           => 'nullable|string|max:500',
            'date'           => 'nullable|date|before_or_equal:today',
        ]);

        $date = $data['date'] ?? now()->toDateString();
        $user = Auth::user();

        DB::transaction(function () use ($task, $user, $data, $date) {
            // Upsert daily entry
            $entry = DailyTaskProgress::updateOrCreate(
                ['task_id' => $task->id, 'user_id' => $user->id, 'date' => $date],
                [
                    'worked_minutes' => $data['worked_minutes'],
                    'progress_delta' => $data['progress_delta'],
                    'note'           => $data['note'] ?? null,
                ]
            );

            // Accumulate user_progress: sum of all their deltas for this task (clamped 0-100)
            $userTotal = DailyTaskProgress::where('task_id', $task->id)
                ->where('user_id', $user->id)
                ->sum('progress_delta');

            $entry->update(['user_progress' => max(0, min(100, (int) $userTotal))]);

            // Recalculate actual_hours on task
            $totalMinutes = DailyTaskProgress::where('task_id', $task->id)->sum('worked_minutes');
            $task->updateQuietly(['actual_hours' => round($totalMinutes / 60, 2)]);

            // Recalculate task progress (auto mode only)
            $taskProgress    = $this->progressService->recalculateAndSave($task->refresh());
            $projectProgress = $this->aggregator->recalculateAndSave($task->project);

            // Broadcast
            event(new ProgressUpdated($task->refresh(), $projectProgress, $user, 'worklog'));
        });

        return response()->json([
            'message'          => 'Travail enregistré.',
            'task_progress'    => $task->fresh()->progress_percent,
            'project_progress' => $task->project->fresh()->progress_percent,
        ]);
    }

    /**
     * GET /tasks/{task}/worklog/users
     * Per-user progress breakdown for this task.
     */
    public function userProgress(Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($task);

        $rows = DailyTaskProgress::where('task_id', $task->id)
            ->select('user_id', DB::raw('SUM(worked_minutes) as total_minutes'), DB::raw('MAX(user_progress) as user_progress'))
            ->groupBy('user_id')
            ->with('user:id,name,email')
            ->get()
            ->map(fn($r) => [
                'user'           => $r->user,
                'total_hours'    => round($r->total_minutes / 60, 2),
                'user_progress'  => $r->user_progress,
            ]);

        return response()->json(['data' => $rows]);
    }

    /**
     * PUT /tasks/{task}/worklog/validate
     * Manager overrides the progress (manager_validation field).
     */
    public function validate(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        $data = $request->validate([
            'manager_validation' => 'required|integer|min:0|max:100',
        ]);

        $task->updateQuietly(['manager_validation' => $data['manager_validation']]);

        $taskProgress    = $this->progressService->recalculateAndSave($task->refresh());
        $projectProgress = $this->aggregator->recalculateAndSave($task->project);

        event(new ProgressUpdated($task->refresh(), $projectProgress, Auth::user(), 'manager'));

        return response()->json([
            'message'          => 'Validation enregistrée.',
            'task_progress'    => $taskProgress,
            'project_progress' => $projectProgress,
        ]);
    }

    private function authorizeTaskAccess(Task $task): void
    {
        $user = Auth::user();
        if (
            !$user->hasPermissionTo('task.view') &&
            !$task->assignees()->where('users.id', $user->id)->exists() &&
            !$task->project->members()->where('users.id', $user->id)->exists()
        ) {
            abort(403);
        }
    }
}
