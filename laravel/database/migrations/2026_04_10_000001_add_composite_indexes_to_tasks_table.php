<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index composites manquants sur la table tasks.
 *
 * Ces index accélèrent :
 *  - (project_id, workflow_status) → filtres Kanban et globaux
 *  - (project_id, due_date)        → calculs de retard et alertes
 *  - (project_id, kanban_order)    → tri Kanban par défaut
 *  - (project_id, sprint_id)       → liste de sprint
 *  - (project_id, deleted_at)      → soft-delete dans les requêtes projet
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->index(['project_id', 'workflow_status'], 'tasks_project_workflow_idx');
            $table->index(['project_id', 'due_date'],        'tasks_project_due_date_idx');
            $table->index(['project_id', 'kanban_order'],    'tasks_project_kanban_idx');
            $table->index(['project_id', 'sprint_id'],       'tasks_project_sprint_idx');
            $table->index(['project_id', 'deleted_at'],      'tasks_project_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_project_workflow_idx');
            $table->dropIndex('tasks_project_due_date_idx');
            $table->dropIndex('tasks_project_kanban_idx');
            $table->dropIndex('tasks_project_sprint_idx');
            $table->dropIndex('tasks_project_deleted_idx');
        });
    }
};
