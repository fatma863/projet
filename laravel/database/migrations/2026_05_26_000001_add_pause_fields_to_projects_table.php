<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Pause audit fields
            $table->timestamp('paused_at')->nullable()->after('status');
            $table->unsignedBigInteger('paused_by')->nullable()->after('paused_at');
            $table->text('pause_reason')->nullable()->after('paused_by');
            $table->string('previous_status', 50)->nullable()->after('pause_reason');

            $table->foreign('paused_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            // Performance index for analytics queries
            $table->index(['status', 'paused_at'], 'idx_projects_pause_analytics');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['paused_by']);
            $table->dropIndex('idx_projects_pause_analytics');
            $table->dropColumn(['paused_at', 'paused_by', 'pause_reason', 'previous_status']);
        });
    }
};
