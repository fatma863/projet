<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('workflow_status', 32)->nullable()->after('status_id')->index();
        });

        if (Schema::hasColumn('tasks', 'workflow_status')) {
            $this->backfillWorkflowStatus();
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('workflow_status');
        });
    }

    private function backfillWorkflowStatus(): void
    {
        $tasks = DB::table('tasks')->select('id', 'progress_percent', 'due_date', 'risk_level')->get();
        foreach ($tasks as $t) {
            $progress = (int) ($t->progress_percent ?? 0);
            $status = 'todo';
            if ($progress >= 100) {
                $status = 'done';
            } elseif (($t->risk_level ?? '') === 'high' || $this->isPastDue($t->due_date, $progress)) {
                $status = 'at_risk';
            } elseif ($progress > 0) {
                $status = 'in_progress';
            }
            DB::table('tasks')->where('id', $t->id)->update(['workflow_status' => $status]);
        }
    }

    private function isPastDue(?string $dueDate, int $progress): bool
    {
        if (! $dueDate || $progress >= 100) {
            return false;
        }

        return strtotime($dueDate) < strtotime('today');
    }
};
