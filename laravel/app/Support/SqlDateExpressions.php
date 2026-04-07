<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Expressions SQL portables (MySQL / MariaDB / SQLite) pour filtres dates dashboard.
 */
class SqlDateExpressions
{
    public static function driver(): string
    {
        return DB::connection()->getDriverName();
    }

    /**
     * Tâche « en retard » : date d’échéance effective strictement avant aujourd’hui (aligné dashboard membre).
     */
    public static function taskOverdueCondition(string $tableAlias = 'tasks'): string
    {
        $col = "COALESCE({$tableAlias}.planned_end, {$tableAlias}.due_date)";

        return match (self::driver()) {
            'sqlite' => "date({$col}) < date('now')",
            default => "DATE({$col}) < CURDATE()",
        };
    }

    /**
     * Jours jusqu’à l’échéance (négatif si dépassée), pour comparaison &lt;= 2.
     */
    public static function taskDaysUntilDeadlineExpr(string $tableAlias = 'tasks'): string
    {
        $col = "COALESCE({$tableAlias}.planned_end, {$tableAlias}.due_date)";

        return match (self::driver()) {
            'sqlite' => "CAST((julianday({$col}) - julianday('now')) AS INTEGER)",
            'mysql', 'mariadb' => "DATEDIFF(DATE({$col}), CURDATE())",
            default => "DATEDIFF(DATE({$col}), CURDATE())",
        };
    }

    public static function predecessorOverdueCondition(string $predAlias = 'pred'): string
    {
        $col = "COALESCE({$predAlias}.planned_end, {$predAlias}.due_date)";

        return match (self::driver()) {
            'sqlite' => "date({$col}) < date('now')",
            default => "DATE({$col}) < CURDATE()",
        };
    }
}
