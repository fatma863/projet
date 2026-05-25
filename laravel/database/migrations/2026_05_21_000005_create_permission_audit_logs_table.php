<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permission_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            // What kind of entity was changed: role | user | project_user
            $table->string('target_type', 30);
            $table->unsignedBigInteger('target_id');
            // Action: granted | revoked | role_created | role_updated | role_deleted
            //         role_archived | role_cloned | permission_synced
            $table->string('action', 50);
            $table->string('permission_name')->nullable();
            $table->json('context')->nullable(); // e.g. { "role": "member", "project_id": 5 }
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_type', 'target_id']);
            $table->index('performed_by');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_audit_logs');
    }
};
