<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->json('checklist')->nullable()->after('description');
            $table->unsignedSmallInteger('activity_score')->default(0)->after('actual_hours');
            $table->enum('progress_mode', ['auto', 'manual'])->default('auto')->after('progress_percent');
            $table->unsignedTinyInteger('manager_validation')->nullable()->after('progress_mode')
                ->comment('Manager override: 0-100, null = not validated');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedTinyInteger('progress_percent')->default(0)->after('status')
                ->comment('Weighted average of task progress');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['checklist', 'activity_score', 'progress_mode', 'manager_validation']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('progress_percent');
        });
    }
};
