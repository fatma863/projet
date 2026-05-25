<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            // Fast filtering by action prefix (module.*)
            $table->index('action', 'idx_activity_logs_action');
            // Fast date range filtering
            $table->index('created_at', 'idx_activity_logs_created_at');
            // Fast full-text lookups on task titles stored in meta
            // (composite covering index for the most common dashboard query)
            $table->index(['project_id', 'severity', 'created_at'], 'idx_activity_logs_project_sev_date');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('idx_activity_logs_action');
            $table->dropIndex('idx_activity_logs_created_at');
            $table->dropIndex('idx_activity_logs_project_sev_date');
        });
    }
};
