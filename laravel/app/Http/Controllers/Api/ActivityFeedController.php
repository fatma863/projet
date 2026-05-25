<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Support\ApiPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ActivityFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = $this->buildQuery($request, $user);

        $paginator = $query->paginate(ApiPagination::perPage($request, 30, 100));

        return response()->json([
            'activities' => ActivityLogResource::collection($paginator),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
            ],
            // Stats are expensive (4 extra queries) — only compute when explicitly requested.
            'stats' => $request->boolean('with_stats') ? $this->buildStats($request, $user) : null,
        ]);
    }

    public function export(Request $request): Response
    {
        $user    = $request->user();
        $query   = $this->buildQuery($request, $user);
        $records = $query->limit(5000)->get();

        $lines = [];
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
                    $user->hasRole('admin') ? ($log->ip_address ?? '') : '',
                ]
            ));
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="journal-audit-' . now()->format('Y-m-d') . '.csv"',
        ]);
    }

    private function buildQuery(Request $request, $user)
    {
        $accessibleProjectSub = Project::query()->accessibleToUser($user)->select('projects.id');

        $query = ActivityLog::query()
            ->with(['actor:id,name,avatar,profile_photo', 'project:id,name'])
            ->whereIn('project_id', $accessibleProjectSub)
            ->orderByDesc('created_at');

        if ($request->filled('project_id')) {
            $pid     = (int) $request->input('project_id');
            $allowed = Project::query()->accessibleToUser($user)->where('projects.id', $pid)->exists();
            abort_if(! $allowed, 403);
            $query->where('project_id', $pid);
        }

        if ($request->filled('actor_id')) {
            $query->where('actor_id', (int) $request->input('actor_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('module')) {
            $module = $request->string('module')->toString();
            $query->where('action', 'like', $module . '.%');
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
            $q = '%' . $request->string('search')->toString() . '%';
            $query->where(function ($sub) use ($q) {
                $sub->where('action', 'like', $q)
                    ->orWhereJsonContains('meta->task_title', $request->string('search')->toString())
                    ->orWhereHas('actor', fn ($u) => $u->where('name', 'like', $q));
            });
        }

        return $query;
    }

    private function buildStats(Request $request, $user): array
    {
        $accessibleProjectSub = Project::query()->accessibleToUser($user)->select('projects.id');

        $base = ActivityLog::query()
            ->whereIn('project_id', $accessibleProjectSub);

        return [
            'total'    => $base->count(),
            'by_severity' => $base->clone()
                ->selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity'),
            'by_module' => $base->clone()
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
