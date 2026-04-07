<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_photo', 512)->nullable()->after('avatar');
            });

            if (Schema::hasColumn('users', 'avatar')) {
                DB::table('users')->whereNull('profile_photo')->whereNotNull('avatar')->update([
                    'profile_photo' => DB::raw('avatar'),
                ]);
            }
        }

        if (Schema::hasTable('notifications') && ! Schema::hasColumn('notifications', 'related_task_id')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->foreignId('related_task_id')->nullable()->after('user_id')->constrained('tasks')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'related_task_id')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropConstrainedForeignId('related_task_id');
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('profile_photo');
            });
        }
    }
};
