<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_assignments', function (Blueprint $table) {
            $table->index('user_id', 'task_assignments_user_id_index');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index('planned_end', 'tasks_planned_end_index');
            $table->index(['archived_at', 'project_id'], 'tasks_archived_project_index');
        });
    }

    public function down(): void
    {
        Schema::table('task_assignments', function (Blueprint $table) {
            $table->dropIndex('task_assignments_user_id_index');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_planned_end_index');
            $table->dropIndex('tasks_archived_project_index');
        });
    }
};
