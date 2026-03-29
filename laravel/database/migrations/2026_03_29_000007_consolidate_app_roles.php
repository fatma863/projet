<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->where('role', 'guest')->update(['role' => 'viewer']);

            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','viewer') NOT NULL DEFAULT 'member'");
            }
        }

        if (! Schema::hasTable('roles')) {
            return;
        }

        Role::findOrCreate('viewer', 'web');
        Role::findOrCreate('member', 'web');

        foreach (User::query()->cursor() as $user) {
            if ($user->hasRole('guest')) {
                $user->removeRole('guest');
                if (! $user->hasRole('viewer')) {
                    $user->assignRole('viewer');
                }
            }
            if ($user->hasRole('manager')) {
                $user->removeRole('manager');
                if (! $user->hasRole('member')) {
                    $user->assignRole('member');
                }
            }
        }

        foreach (['guest', 'manager'] as $name) {
            $role = Role::query()->where('guard_name', 'web')->where('name', $name)->first();
            if ($role) {
                $role->permissions()->detach();
                $role->delete();
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->where('role', 'viewer')->update(['role' => 'guest']);
            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','guest') NOT NULL DEFAULT 'member'");
            }
        }

        Role::findOrCreate('guest', 'web');
        Role::findOrCreate('manager', 'web');
    }
};
