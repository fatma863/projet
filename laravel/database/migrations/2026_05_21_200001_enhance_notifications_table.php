<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Direct actor reference (faster queries than data->actor_id)
            $table->foreignId('actor_id')->nullable()->after('user_id')
                ->constrained('users')->nullOnDelete();

            // Polymorphic entity (task, project, sprint, etc.)
            $table->string('entity_type', 50)->nullable()->after('related_task_id');
            $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');

            $table->index(['entity_type', 'entity_id']);
            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'created_at']);
        });

        // Extended per-type preferences on the users table
        // (avoids a separate notification_preferences table)
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_type_task_updated')->default(true)->after('notify_type_task_delayed');
            $table->boolean('notify_type_task_completed')->default(true)->after('notify_type_task_updated');
            $table->boolean('notify_type_sprint')->default(true)->after('notify_type_task_completed');
            $table->boolean('notify_type_permission')->default(true)->after('notify_type_sprint');
            $table->boolean('notify_type_invitation')->default(true)->after('notify_type_permission');
            $table->boolean('notify_type_ai_alert')->default(true)->after('notify_type_invitation');
            $table->boolean('notify_type_project')->default(true)->after('notify_type_ai_alert');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'notify_type_task_updated',
                'notify_type_task_completed',
                'notify_type_sprint',
                'notify_type_permission',
                'notify_type_invitation',
                'notify_type_ai_alert',
                'notify_type_project',
            ]);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['actor_id']);
            $table->dropColumn(['actor_id', 'entity_type', 'entity_id']);
        });
    }
};
