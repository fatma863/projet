<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
            $table->string('module', 50)->nullable()->after('slug');
            $table->string('action', 50)->nullable()->after('module');
            $table->string('scope', 20)->default('global')->after('action'); // global | project
            $table->text('description')->nullable()->after('scope');
            $table->foreignId('group_id')
                ->nullable()
                ->after('description')
                ->constrained('permission_groups')
                ->nullOnDelete();
            $table->boolean('is_system')->default(false)->after('group_id');
        });

        // Populate slug from existing permission names
        \DB::table('permissions')->get()->each(function ($permission) {
            \DB::table('permissions')
                ->where('id', $permission->id)
                ->update(['slug' => $permission->name]);
        });
    }

    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropForeign(['group_id']);
            $table->dropColumn(['slug', 'module', 'action', 'scope', 'description', 'group_id', 'is_system']);
        });
    }
};
