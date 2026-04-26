<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedBigInteger('chef_id')->nullable()->after('project_manager_id');
            $table->foreign('chef_id')->references('id')->on('users')->nullOnDelete();
        });

        // Populate from existing project_manager_id
        DB::table('projects')
            ->whereNotNull('project_manager_id')
            ->update(['chef_id' => DB::raw('project_manager_id')]);

        // For projects with no PM, fall back to owner
        DB::table('projects')
            ->whereNull('chef_id')
            ->whereNotNull('owner_id')
            ->update(['chef_id' => DB::raw('owner_id')]);

        // Simplify project_user.role: set all existing rows to 'member'
        if (Schema::hasTable('project_user') && Schema::hasColumn('project_user', 'role')) {
            DB::table('project_user')->update(['role' => 'member']);
        }
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['chef_id']);
            $table->dropColumn('chef_id');
        });
    }
};
