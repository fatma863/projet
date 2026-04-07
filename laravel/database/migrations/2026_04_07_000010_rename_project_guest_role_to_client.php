<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (Schema::hasTable('project_user') && $driver === 'mysql') {
            DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','client','guest','viewer') NOT NULL DEFAULT 'member'");
        }

        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->whereIn('role', ['guest', 'viewer'])->update(['role' => 'client']);
        }

        if (Schema::hasTable('project_members')) {
            DB::table('project_members')->whereIn('project_role', ['guest', 'viewer'])->update(['project_role' => 'client']);
        }

        if (Schema::hasTable('project_invitations')) {
            DB::table('project_invitations')->whereIn('role', ['guest', 'viewer'])->update(['role' => 'client']);
        }

        if (Schema::hasTable('project_user') && $driver === 'mysql') {
            DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','client') NOT NULL DEFAULT 'member'");
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (Schema::hasTable('project_user') && $driver === 'mysql') {
            DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','client','guest','viewer') NOT NULL DEFAULT 'member'");
        }

        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->where('role', 'client')->update(['role' => 'guest']);
        }

        if (Schema::hasTable('project_members')) {
            DB::table('project_members')->where('project_role', 'client')->update(['project_role' => 'guest']);
        }

        if (Schema::hasTable('project_invitations')) {
            DB::table('project_invitations')->where('role', 'client')->update(['role' => 'guest']);
        }

        if (Schema::hasTable('project_user') && $driver === 'mysql') {
            DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','guest') NOT NULL DEFAULT 'member'");
        }
    }
};
