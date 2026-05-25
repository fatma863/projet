<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->json('old_values')->nullable()->after('meta');
            $table->json('new_values')->nullable()->after('old_values');
            $table->json('changed_fields')->nullable()->after('new_values');
            $table->string('ip_address', 45)->nullable()->after('changed_fields');
            $table->string('user_agent', 500)->nullable()->after('ip_address');
            $table->string('severity', 20)->default('info')->after('user_agent');
            $table->string('source', 50)->default('web')->after('severity');
            $table->string('actor_role', 100)->nullable()->after('source');

            $table->index('severity');
            $table->index('actor_id');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn(['old_values', 'new_values', 'changed_fields', 'ip_address', 'user_agent', 'severity', 'source', 'actor_role']);
        });
    }
};
