<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use App\Support\SqlDateExpressions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Indicateurs globaux pour les administrateurs applicatifs.
 */
class AdminDashboardService
{
    public const CACHE_KEY = 'admin_dashboard_global';

    public const CACHE_TTL_SECONDS = 45;

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(): array
    {
        $userCount = User::query()->count();
        $projectCount = Project::query()->count();

        $overdueExpr = SqlDateExpressions::taskOverdueCondition('tasks');

        $row = DB::table('tasks')
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->selectRaw('
                COUNT(*) as tasks_total,
                SUM(CASE WHEN tasks.progress_percent >= 100 OR IFNULL(tasks.workflow_status, \'\') = \'done\' THEN 1 ELSE 0 END) as tasks_completed,
                SUM(CASE
                    WHEN (tasks.progress_percent < 100 AND (tasks.workflow_status IS NULL OR tasks.workflow_status <> \'done\'))
                    AND COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL
                    AND ('.$overdueExpr.')
                    THEN 1 ELSE 0
                END) as tasks_overdue
            ')
            ->first();

        $taskCount = (int) ($row->tasks_total ?? 0);
        $completed = (int) ($row->tasks_completed ?? 0);
        $delayed = (int) ($row->tasks_overdue ?? 0);

        $completionRate = $taskCount > 0 ? round(100 * $completed / $taskCount, 1) : 0.0;

        return [
            'users_total' => $userCount,
            'projects_total' => $projectCount,
            'tasks_total' => $taskCount,
            'tasks_completed' => $completed,
            'global_completion_rate_percent' => $completionRate,
            'tasks_overdue' => $delayed,
        ];
    }
}
