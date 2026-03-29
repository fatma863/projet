<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Support\AccessControl;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckProjectAccess
{
    public function handle(Request $request, Closure $next, string $mode = 'view'): Response
    {
        $project = $request->route('project');
        if (!$project instanceof Project) {
            return $next($request);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        if (!AccessControl::canViewProject($user, $project)) {
            return response()->json(['message' => 'Accès projet refusé.'], 403);
        }

        if ($mode === 'edit' && !AccessControl::canEditProject($user, $project)) {
            return response()->json(['message' => 'Modification projet refusée.'], 403);
        }

        return $next($request);
    }
}
