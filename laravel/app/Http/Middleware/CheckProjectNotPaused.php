<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\Task;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks all write operations (POST, PUT, PATCH, DELETE) on a paused project.
 *
 * Routes exempt from this middleware:
 *  - GET / HEAD / OPTIONS (read-only)
 *  - POST /projects/{id}/pause   (pause itself)
 *  - POST /projects/{id}/resume  (resume itself)
 *
 * Project resolution order:
 *  1. /projects/{id}/...  → project_id from URL segment
 *  2. /tasks/{id}/...     → project_id via task lookup
 */
class CheckProjectNotPaused
{
    /** HTTP methods that are always allowed (read-only). */
    private const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    /** URI suffix patterns that bypass the lock (pause/resume management). */
    private const BYPASS_PATTERNS = [
        '/pause',
        '/resume',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Read-only methods are never blocked.
        if (in_array($request->method(), self::SAFE_METHODS, true)) {
            return $next($request);
        }

        // The pause/resume endpoints themselves are always allowed.
        foreach (self::BYPASS_PATTERNS as $pattern) {
            if (str_ends_with(rtrim($request->path(), '/'), $pattern)) {
                return $next($request);
            }
        }

        $projectId = $this->resolveProjectId($request);

        if ($projectId === null) {
            return $next($request);
        }

        $project = Project::find($projectId);

        if ($project && $project->isPaused()) {
            return response()->json([
                'status'  => Response::HTTP_LOCKED,
                'message' => '⏸️ This project is paused. Modifications are disabled.',
                'code'    => 'PROJECT_LOCKED',
                'project' => [
                    'id'           => $project->id,
                    'name'         => $project->name,
                    'pause_reason' => $project->pause_reason,
                    'paused_at'    => $project->paused_at?->toISOString(),
                ],
            ], Response::HTTP_LOCKED); // 423
        }

        return $next($request);
    }

    /**
     * Resolve the project_id from the incoming request URI.
     *
     * Handles two patterns:
     *  - /api/projects/{id}[/...]
     *  - /api/tasks/{id}[/...]      → loads the task to get project_id
     */
    private function resolveProjectId(Request $request): ?int
    {
        $path = $request->path(); // e.g. "api/projects/42/tasks"

        // Pattern 1: project route  →  api/projects/{id}...
        if (preg_match('#(?:^|/)projects/(\d+)#', $path, $matches)) {
            return (int) $matches[1];
        }

        // Pattern 2: task route  →  api/tasks/{id}...
        if (preg_match('#(?:^|/)tasks/(\d+)#', $path, $matches)) {
            $task = Task::select('project_id')->find((int) $matches[1]);

            return $task?->project_id ? (int) $task->project_id : null;
        }

        return null;
    }
}
