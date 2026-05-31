<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Support\AccessControl;
use App\Support\ApiPagination;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class ActivityFeedController extends Controller
{
    // ── RBAC access resolver ──────────────────────────────────────────────────

    /**
     * Compute the per-user access context once and share it across all methods.
     *
     * Returns:
     *   isAdmin              → bool   : true if global admin
     *   isChef               → bool   : true if chef/owner in at least one project
     *   chefProjectIds       → Collection<int> : projects where user is chef/owner
     *   memberOnlyProjectIds → Collection<int> : accessible projects where user is NOT chef/owner
     */
    private function resolveAccess($user): array
    {
        if (AccessControl::isAdmin($user)) {
            return [
                'isAdmin'              => true,
                'isChef'               => true,
                'chefProjectIds'       => collect(),
                'memberOnlyProjectIds' => collect(),
            ];
        }

        $chefProjectIds = Project::query()
            ->where(fn ($q) => $q->where('chef_id', $user->id)->orWhere('owner_id', $user->id))
            ->pluck('id');

        $accessibleProjectIds = Project::query()->accessibleToUser($user)->pluck('projects.id');
        $memberOnlyProjectIds = $accessibleProjectIds->diff($chefProjectIds);

        return [
            'isAdmin'              => false,
            'isChef'               => $chefProjectIds->isNotEmpty(),
            'chefProjectIds'       => $chefProjectIds,
            'memberOnlyProjectIds' => $memberOnlyProjectIds,
        ];
    }

    /**
     * Apply the RBAC visibility filter to an ActivityLog query.
     *
     * Rules:
     *   Admin              → no filter (all events)
     *   Chef (project X)   → all events in project X
     *   Member (project Y) → only events where actor_id = user->id in project Y
     *   No projects        → only own events (actor_id = user->id)
     */
    private function applyRbacFilter(Builder $query, $user, array $access): void
    {
        if ($access['isAdmin']) {
            return;
        }

        /** @var Collection $chefIds */
        $chefIds  = $access['chefProjectIds'];
        $memberIds = $access['memberOnlyProjectIds'];

        if ($chefIds->isEmpty() && $memberIds->isEmpty()) {
            $query->where('actor_id', $user->id);
            return;
        }

        $query->where(function (Builder $q) use ($user, $chefIds, $memberIds) {
            // Chef/Owner projects: all events visible
            if ($chefIds->isNotEmpty()) {
                $q->whereIn('project_id', $chefIds);
            }

            // Member-only projects: only own events (no cross-user access)
            if ($memberIds->isNotEmpty()) {
                $q->orWhere(function (Builder $inner) use ($user, $memberIds) {
                    $inner->whereIn('project_id', $memberIds)
                          ->where('actor_id', $user->id);
                });
            }
        });
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $user   = $request->user();
        $access = $this->resolveAccess($user);
        $query  = $this->buildQuery($request, $user, $access);

        $paginator = $query->paginate(ApiPagination::perPage($request, 30, 100));

        return response()->json([
            'activities' => ActivityLogResource::collection($paginator),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
            ],
            'stats' => $request->boolean('with_stats') ? $this->buildStats($user, $access) : null,
        ]);
    }

    public function export(Request $request): Response
    {
        $user   = $request->user();
        $access = $this->resolveAccess($user);

        // Bulk CSV export is restricted to admins and project chefs.
        if (! $access['isAdmin'] && ! $access['isChef']) {
            abort(403, 'L\'export des journaux est réservé aux administrateurs et chefs de projet.');
        }

        $query   = $this->buildQuery($request, $user, $access);
        $records = $query->limit(5000)->get();

        $lines   = [];
        $lines[] = implode(',', [
            'ID', 'Date', 'Acteur', 'Rôle acteur', 'Action', 'Module',
            'Entité', 'Projet', 'Sévérité', 'Source', 'IP',
        ]);

        foreach ($records as $log) {
            $lines[] = implode(',', array_map(
                fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                [
                    $log->id,
                    $log->created_at?->format('d/m/Y H:i:s'),
                    $log->actor?->name ?? 'Système',
                    $log->actor_role ?? '',
                    $log->action,
                    $this->moduleFromAction($log->action),
                    $log->entity_type ? class_basename($log->entity_type) . '#' . $log->entity_id : '',
                    $log->project?->name ?? '',
                    $log->severity ?? 'info',
                    $log->source ?? 'web',
                    $access['isAdmin'] ? ($log->ip_address ?? '') : '',
                ]
            ));
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="journal-audit-' . now()->format('Y-m-d') . '.csv"',
        ]);
    }

    // ── Query builders ────────────────────────────────────────────────────────

    private function buildQuery(Request $request, $user, array $access): Builder
    {
        $query = ActivityLog::query()
            ->with(['actor:id,name,avatar,profile_photo', 'project:id,name'])
            ->orderByDesc('created_at');

        $this->applyRbacFilter($query, $user, $access);

        // ── project_id filter ──────────────────────────────────────────────────
        if ($request->filled('project_id')) {
            $pid = (int) $request->input('project_id');

            if (! $access['isAdmin']) {
                $allAccessible = $access['chefProjectIds']->merge($access['memberOnlyProjectIds']);
                abort_if(! $allAccessible->contains($pid), 403, 'Accès refusé au projet demandé.');
            }

            $query->where('project_id', $pid);
        }

        // ── actor_id filter ────────────────────────────────────────────────────
        if ($request->filled('actor_id')) {
            $actorId = (int) $request->input('actor_id');

            // Non-admin, non-chef users may only filter by their own actor_id.
            if (! $access['isAdmin'] && ! $access['isChef'] && $actorId !== $user->id) {
                abort(403, 'Vous ne pouvez filtrer que par votre propre identifiant d\'acteur.');
            }

            $query->where('actor_id', $actorId);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('module')) {
            $query->where('action', 'like', $request->string('module')->toString() . '.%');
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->string('severity'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->string('search')->toString() . '%';
            $raw  = $request->string('search')->toString();
            $query->where(function (Builder $sub) use ($term, $raw) {
                $sub->where('action', 'like', $term)
                    ->orWhereJsonContains('meta->task_title', $raw)
                    ->orWhereHas('actor', fn ($u) => $u->where('name', 'like', $term));
            });
        }

        return $query;
    }

    private function buildStats($user, array $access): array
    {
        $base = ActivityLog::query();
        $this->applyRbacFilter($base, $user, $access);

        return [
            'total'       => $base->count(),
            'by_severity' => $base->clone()
                ->selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity'),
            'by_module'   => $base->clone()
                ->selectRaw('SUBSTRING_INDEX(action, ".", 1) as module, count(*) as count')
                ->groupBy('module')
                ->orderByDesc('count')
                ->limit(10)
                ->pluck('count', 'module'),
            'last_7_days' => $base->clone()
                ->selectRaw('DATE(created_at) as day, count(*) as count')
                ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                ->groupBy('day')
                ->orderBy('day')
                ->pluck('count', 'day'),
        ];
    }

    private function moduleFromAction(string $action): string
    {
        return ucfirst(explode('.', $action)[0] ?? $action);
    }
}
