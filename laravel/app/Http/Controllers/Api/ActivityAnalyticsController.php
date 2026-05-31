<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ActivityAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admins and project chefs may access aggregated analytics.
        // Regular members must not see other users' activity statistics.
        $isAdmin = $user->hasRole('admin');
        $isChef  = $isAdmin || Project::where('chef_id', $user->id)->exists();
        if (! $isChef) {
            abort(403, 'Les tableaux de bord analytiques sont réservés aux administrateurs et chefs de projet.');
        }

        $accessibleIds     = Project::query()->accessibleToUser($user)->pluck('projects.id');
        $cacheKey          = 'activity_analytics_' . $user->id . '_' . md5($accessibleIds->sort()->implode(','));

        $data = Cache::remember($cacheKey, 300, function () use ($accessibleIds) {
            return [
                'top_users'           => $this->topUsers($accessibleIds),
                'by_module'           => $this->byModule($accessibleIds),
                'by_severity'         => $this->bySeverity($accessibleIds),
                'trend_28d'           => $this->trend28Days($accessibleIds),
                'unstable_tasks'      => $this->unstableTasks($accessibleIds),
                'inactive_users'      => $this->inactiveProjectMembers($accessibleIds),
                'spikes'              => $this->detectSpikes($accessibleIds),
                'collaboration_score' => $this->collaborationScore($accessibleIds),
                'kpis'                => $this->kpis($accessibleIds),
                'generated_at'        => now()->toISOString(),
            ];
        });

        return response()->json($data);
    }

    // ── Top 5 most active users (last 30 days) ────────────────────────────────

    private function topUsers(Collection $ids): array
    {
        return ActivityLog::query()
            ->select('actor_id', DB::raw('count(*) as count'))
            ->with('actor:id,name,avatar,profile_photo')
            ->whereIn('project_id', $ids)
            ->whereNotNull('actor_id')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('actor_id')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'user_id'    => $r->actor_id,
                'name'       => $r->actor?->name ?? 'Inconnu',
                'avatar_url' => $r->actor?->avatar_url,
                'count'      => (int) $r->count,
            ])
            ->toArray();
    }

    // ── Activity by module (first segment of action string) ──────────────────

    private function byModule(Collection $ids): array
    {
        return ActivityLog::query()
            ->selectRaw("SUBSTRING_INDEX(action, '.', 1) as module, count(*) as count")
            ->whereIn('project_id', $ids)
            ->groupBy('module')
            ->orderByDesc('count')
            ->pluck('count', 'module')
            ->map(fn ($v) => (int) $v)
            ->toArray();
    }

    // ── Distribution by severity ──────────────────────────────────────────────

    private function bySeverity(Collection $ids): array
    {
        return ActivityLog::query()
            ->selectRaw('severity, count(*) as count')
            ->whereIn('project_id', $ids)
            ->groupBy('severity')
            ->pluck('count', 'severity')
            ->map(fn ($v) => (int) $v)
            ->toArray();
    }

    // ── Daily trend last 28 days ──────────────────────────────────────────────

    private function trend28Days(Collection $ids): array
    {
        $rows = ActivityLog::query()
            ->selectRaw('DATE(created_at) as day, count(*) as count')
            ->whereIn('project_id', $ids)
            ->where('created_at', '>=', now()->subDays(27)->startOfDay())
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('count', 'day')
            ->map(fn ($v) => (int) $v)
            ->toArray();

        // Fill missing days with 0
        $result = [];
        for ($i = 27; $i >= 0; $i--) {
            $day = now()->subDays($i)->format('Y-m-d');
            $result[$day] = $rows[$day] ?? 0;
        }
        return $result;
    }

    // ── Smart: unstable tasks (>5 updates in 7 days) ─────────────────────────

    private function unstableTasks(Collection $ids): array
    {
        return ActivityLog::query()
            ->select('entity_id', DB::raw('count(*) as update_count'))
            ->selectRaw("MAX(JSON_UNQUOTE(JSON_EXTRACT(meta, '$.task_title'))) as task_title")
            ->whereIn('project_id', $ids)
            ->where('action', 'task.updated')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('entity_id')
            ->having('update_count', '>', 5)
            ->orderByDesc('update_count')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'task_id'      => $r->entity_id,
                'title'        => $r->task_title ?? "Tâche #{$r->entity_id}",
                'update_count' => (int) $r->update_count,
                'risk_level'   => $r->update_count > 10 ? 'critical' : 'warning',
            ])
            ->toArray();
    }

    // ── Smart: project members with 0 activity in 14 days ────────────────────

    private function inactiveProjectMembers(Collection $ids): array
    {
        if ($ids->isEmpty()) {
            return [];
        }

        $activeUserIds = ActivityLog::query()
            ->whereIn('project_id', $ids)
            ->where('created_at', '>=', now()->subDays(14))
            ->whereNotNull('actor_id')
            ->distinct()
            ->pluck('actor_id');

        return DB::table('project_members as pm')
            ->join('users as u', 'u.id', '=', 'pm.user_id')
            ->whereIn('pm.project_id', $ids)
            ->whereNotIn('pm.user_id', $activeUserIds)
            ->select('u.id as user_id', 'u.name', 'u.avatar', 'u.profile_photo')
            ->distinct()
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'user_id' => $r->user_id,
                'name'    => $r->name,
            ])
            ->toArray();
    }

    // ── Smart: detect activity spikes (days with count > 2× 7-day avg) ───────

    private function detectSpikes(Collection $ids): array
    {
        $daily = ActivityLog::query()
            ->selectRaw('DATE(created_at) as day, count(*) as count')
            ->whereIn('project_id', $ids)
            ->where('created_at', '>=', now()->subDays(29))
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($r) => ['day' => $r->day, 'count' => (int) $r->count]);

        if ($daily->isEmpty()) return [];

        $avg = $daily->avg('count');
        $threshold = max($avg * 2, 5);

        return $daily
            ->filter(fn ($r) => $r['count'] >= $threshold)
            ->map(fn ($r) => ['day' => $r['day'], 'count' => $r['count'], 'avg' => round($avg, 1)])
            ->values()
            ->toArray();
    }

    // ── Collaboration score (% of actions involving multiple users) ──────────

    private function collaborationScore(Collection $ids): int
    {
        if ($ids->isEmpty()) return 0;

        $total = ActivityLog::whereIn('project_id', $ids)->where('created_at', '>=', now()->subDays(30))->count();
        if ($total === 0) return 0;

        $multiUser = ActivityLog::query()
            ->whereIn('project_id', $ids)
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('action', ['task.assigned', 'task.comment_added', 'project.member_added', 'project.user_invited'])
            ->count();

        return (int) min(100, round(($multiUser / $total) * 100 * 2.5));
    }

    // ── Overall KPIs ──────────────────────────────────────────────────────────

    private function kpis(Collection $ids): array
    {
        $base = ActivityLog::whereIn('project_id', $ids);

        return [
            'total_30d'       => $base->clone()->where('created_at', '>=', now()->subDays(30))->count(),
            'total_7d'        => $base->clone()->where('created_at', '>=', now()->subDays(7))->count(),
            'critical_7d'     => $base->clone()->where('severity', 'critical')->where('created_at', '>=', now()->subDays(7))->count(),
            'unique_users_7d' => $base->clone()->where('created_at', '>=', now()->subDays(7))->distinct('actor_id')->count('actor_id'),
            'tasks_updated_7d' => $base->clone()->where('action', 'task.updated')->where('created_at', '>=', now()->subDays(7))->count(),
        ];
    }
}
