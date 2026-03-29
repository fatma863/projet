<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('activity_logs', 'entity_type')) {
                $table->string('entity_type')->nullable()->after('action');
            }

            if (!Schema::hasColumn('activity_logs', 'entity_id')) {
                $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');
            }

            if (!Schema::hasColumn('activity_logs', 'meta')) {
                // Keep nullable for backward compatibility with older rows.
                $table->json('meta')->nullable()->after('entity_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            if (Schema::hasColumn('activity_logs', 'meta')) {
                $table->dropColumn('meta');
            }
            if (Schema::hasColumn('activity_logs', 'entity_id')) {
                $table->dropColumn('entity_id');
            }
            if (Schema::hasColumn('activity_logs', 'entity_type')) {
                $table->dropColumn('entity_type');
            }
        });
    }
};

