<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Supports two syntaxes:
     *  - check.role:admin,member   → user must have at least one of these roles
     *  - check.role:!client        → user must NOT have this role (prefix with "!")
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        if (empty($roles)) {
            return $next($request);
        }

        // Separate exclusions (!role) from inclusions (role)
        $excluded = array_map(fn ($r) => ltrim($r, '!'), array_filter($roles, fn ($r) => str_starts_with($r, '!')));
        $included = array_values(array_filter($roles, fn ($r) => ! str_starts_with($r, '!')));

        // Check exclusions: if user has ANY excluded role → deny
        if (! empty($excluded) && $user->hasAnyRole($excluded)) {
            return response()->json(['message' => 'Accès refusé pour ce rôle.'], 403);
        }

        // Check inclusions: if specified, user must have at least one
        if (! empty($included) && ! $user->hasAnyRole($included)) {
            return response()->json(['message' => 'Accès refusé pour ce rôle.'], 403);
        }

        return $next($request);
    }
}
