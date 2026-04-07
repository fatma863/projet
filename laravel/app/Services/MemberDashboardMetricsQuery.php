<?php

namespace App\Services;

use App\Support\SqlDateExpressions;
use Illuminate\Support\Facades\DB;

/**
 * Agrégations SQL pour le dashboard membre (évite chargement N tâches + boucles PHP).
 */
class MemberDashboardMetricsQuery
{
    private const OPEN_SQL = "(tasks.progress_percent < 100 AND (tasks.workflow_status IS NULL OR tasks.workflow_status <> 'done'))";

    private const DONE_SQL = "(tasks.progress_percent >= 100 OR IFNULL(tasks.workflow_status, '') = 'done')";

    private const PRED_OPEN_SQL = '(pred.progress_percent < 100 AND (pred.workflow_status IS NULL OR pred.workflow_status <> \'done\'))';

    /**
     * @return array{
     *   total_assigned:int,
     *   completed:int,
     *   in_progress:int,
     *   todo:int,
     *   overdue_count:int,
     *   open_estimated_hours:float,
     *   blocked_count:int,
     *   at_risk_count:int,
     *   critical_count:int
     * }
     */
    public function aggregateForUser(int $userId): array
    {
        $overdueWhen = SqlDateExpressions::taskOverdueCondition('tasks');
        $daysLeft = SqlDateExpressions::taskDaysUntilDeadlineExpr('tasks');
        $predOverdue = SqlDateExpressions::predecessorOverdueCondition('pred');

        $row = DB::table('tasks')
            ->join('task_assignments', 'tasks.id', '=', 'task_assignments.task_id')
            ->where('task_assignments.user_id', $userId)
            ->whereNull('tasks.deleted_at')
            ->whereNull('tasks.archived_at')
            ->selectRaw('
                COUNT(*) as total_assigned,
                SUM(CASE WHEN '.self::DONE_SQL.' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND (tasks.workflow_status = \'in_progress\' OR tasks.progress_percent > 0) THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND NOT (tasks.workflow_status = \'in_progress\' OR tasks.progress_percent > 0) THEN 1 ELSE 0 END) as todo,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL AND ('.$overdueWhen.') THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN '.self::OPEN_SQL.' THEN COALESCE(tasks.estimated_hours, 0) ELSE 0 END) as open_estimated_hours,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND EXISTS (
                    SELECT 1 FROM task_dependencies td
                    INNER JOIN tasks pred ON pred.id = td.depends_on_task_id AND pred.deleted_at IS NULL
                    WHERE td.task_id = tasks.id
                    AND pred.archived_at IS NULL
                    AND '.self::PRED_OPEN_SQL.'
                ) THEN 1 ELSE 0 END) as blocked_count,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND (
                    (COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL AND tasks.progress_percent < 50 AND ('.$daysLeft.') <= 2)
                    OR EXISTS (
                        SELECT 1 FROM task_dependencies td2
                        INNER JOIN tasks pred ON pred.id = td2.depends_on_task_id AND pred.deleted_at IS NULL
                        WHERE td2.task_id = tasks.id
                        AND pred.archived_at IS NULL
                        AND '.self::PRED_OPEN_SQL.'
                        AND ('.$predOverdue.')
                    )
                ) THEN 1 ELSE 0 END) as at_risk_count,
                SUM(CASE WHEN '.self::OPEN_SQL.' AND tasks.priority IN (\'high\', \'urgent\') AND (
                    (COALESCE(tasks.planned_end, tasks.due_date) IS NOT NULL AND ('.$overdueWhen.'))
                    OR EXISTS (
                        SELECT 1 FROM task_dependencies td3
                        INNER JOIN tasks pred ON pred.id = td3.depends_on_task_id AND pred.deleted_at IS NULL
                        WHERE td3.task_id = tasks.id
                        AND pred.archived_at IS NULL
                        AND '.self::PRED_OPEN_SQL.'
                    )
                ) THEN 1 ELSE 0 END) as critical_count
            ')
            ->first();

        return [
            'total_assigned' => (int) ($row->total_assigned ?? 0),
            'completed' => (int) ($row->completed ?? 0),
            'in_progress' => (int) ($row->in_progress ?? 0),
            'todo' => (int) ($row->todo ?? 0),
            'overdue_count' => (int) ($row->overdue_count ?? 0),
            'open_estimated_hours' => round((float) ($row->open_estimated_hours ?? 0), 2),
            'blocked_count' => (int) ($row->blocked_count ?? 0),
            'at_risk_count' => (int) ($row->at_risk_count ?? 0),
            'critical_count' => (int) ($row->critical_count ?? 0),
        ];
    }

    /**
     * @return array<int, true>
     */
    public function blockedTaskIdSetForUser(int $userId): array
    {
        $ids = DB::table('task_dependencies')
            ->join('tasks as dependent', 'dependent.id', '=', 'task_dependencies.task_id')
            ->join('task_assignments', 'task_assignments.task_id', '=', 'dependent.id')
            ->join('tasks as pred', 'pred.id', '=', 'task_dependencies.depends_on_task_id')
            ->where('task_assignments.user_id', $userId)
            ->whereNull('dependent.deleted_at')
            ->whereNull('dependent.archived_at')
            ->whereNull('pred.deleted_at')
            ->whereNull('pred.archived_at')
            ->whereRaw('(pred.progress_percent < 100 AND (pred.workflow_status IS NULL OR pred.workflow_status <> ?))', ['done'])
            ->distinct()
            ->pluck('dependent.id');

        $map = [];
        foreach ($ids as $id) {
            $map[(int) $id] = true;
        }

        return $map;
    }
}
