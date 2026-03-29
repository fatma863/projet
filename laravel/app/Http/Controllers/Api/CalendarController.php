<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Task::query()->accessibleBy($user)->with(['project', 'assignees']);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('user_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->integer('user_id')));
        }
        if ($request->filled('from')) {
            $from = $request->date('from');
            $query->where(function ($q) use ($from) {
                $q->whereDate('due_date', '>=', $from)
                    ->orWhereDate('planned_start', '>=', $from)
                    ->orWhereDate('planned_end', '>=', $from);
            });
        }
        if ($request->filled('to')) {
            $to = $request->date('to');
            $query->where(function ($q) use ($to) {
                $q->whereDate('due_date', '<=', $to)
                    ->orWhereDate('planned_start', '<=', $to)
                    ->orWhereDate('planned_end', '<=', $to);
            });
        }

        $tasks = $query->orderBy('due_date')->orderBy('planned_start')->get()->map(function (Task $task) {
            $wf = $task->workflow_status ?? Task::inferWorkflowStatus($task);

            return [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'title' => $task->title,
                'deadline' => $task->due_date?->toDateString(),
                'start_date' => $task->planned_start?->toDateString(),
                'end_date' => $task->planned_end?->toDateString(),
                'status' => $wf,
                'workflow_status' => $wf,
                'priority' => $task->priority,
                'progress_percent' => $task->progress_percent,
                'project' => $task->project ? [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'code' => $task->project->code,
                ] : null,
                'user' => $task->assignees->first() ? [
                    'id' => $task->assignees->first()->id,
                    'name' => $task->assignees->first()->name,
                ] : null,
                'assignees' => $task->assignees->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                ]),
            ];
        });

        return response()->json(['tasks' => $tasks]);
    }
}
