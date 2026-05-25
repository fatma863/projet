<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class WatcherController extends Controller
{
    /**
     * GET /tasks/{task}/watchers
     * List all watchers for a task.
     */
    public function index(Task $task): JsonResponse
    {
        $watchers = $task->watchers()->select('users.id', 'users.name', 'users.email')->get();

        return response()->json([
            'data'         => $watchers,
            'is_watching'  => $watchers->contains('id', Auth::id()),
        ]);
    }

    /**
     * POST /tasks/{task}/watch
     * Current user starts watching this task.
     */
    public function watch(Task $task): JsonResponse
    {
        $task->watchers()->syncWithoutDetaching([Auth::id()]);

        return response()->json(['message' => 'Vous surveillez cette tâche.', 'is_watching' => true]);
    }

    /**
     * DELETE /tasks/{task}/watch
     * Current user stops watching this task.
     */
    public function unwatch(Task $task): JsonResponse
    {
        $task->watchers()->detach(Auth::id());

        return response()->json(['message' => 'Vous ne surveillez plus cette tâche.', 'is_watching' => false]);
    }
}
