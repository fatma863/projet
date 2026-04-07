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
            $table->unsignedInteger('position')->default(0)->after('kanban_order');
        });

        $projectIds = DB::table('tasks')->select('project_id')->distinct()->pluck('project_id');
        foreach ($projectIds as $pid) {
            $tasks = DB::table('tasks')
                ->where('project_id', $pid)
                ->whereNull('sprint_id')
                ->whereNull('deleted_at')
                ->orderBy('kanban_order')
                ->orderBy('id')
                ->get(['id']);

            foreach ($tasks as $i => $row) {
                DB::table('tasks')->where('id', $row->id)->update(['position' => $i]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};
