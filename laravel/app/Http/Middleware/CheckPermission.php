<?php

namespace App\Http\Middleware;

use App\Services\PermissionResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes:
 *   ->middleware('check.permission:task.edit')
 *   ->middleware('check.permission:task.edit,project')   // resolves project from route
 *
 * When the second argument is 'project', the middleware reads the {project} route param
 * and resolves permissions scoped to that project.
 */
class CheckPermission
{
    public function __construct(private readonly PermissionResolver $resolver) {}

    public function handle(Request $request, Closure $next, string $permission, string $scope = 'global'): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $projectId = null;
        if ($scope === 'project') {
            $project   = $request->route('project');
            $projectId = is_object($project) ? $project->id : (int) $project;
        }

        if (! $this->resolver->userCan($user, $permission, $projectId ?: null)) {
            return response()->json([
                'message' => 'Permission refusée : ' . $permission,
            ], 403);
        }

        return $next($request);
    }
}
