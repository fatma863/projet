<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->string('color', 20)->default('#6366f1')->after('description');
            $table->string('icon', 50)->default('Shield')->after('color');
            $table->unsignedTinyInteger('level')->default(10)->after('icon');
            $table->boolean('is_system')->default(false)->after('level');
            $table->boolean('is_archived')->default(false)->after('is_system');
        });

        // Mark the three canonical roles as system roles so they can't be deleted
        \DB::table('roles')
            ->whereIn('name', ['admin', 'member', 'client'])
            ->update(['is_system' => true]);

        // Set distinct colors/levels for canonical roles
        \DB::table('roles')->where('name', 'admin')
            ->update(['color' => '#ef4444', 'icon' => 'ShieldCheck', 'level' => 100, 'description' => 'Administrateur système — accès total']);
        \DB::table('roles')->where('name', 'member')
            ->update(['color' => '#6366f1', 'icon' => 'UserCheck', 'level' => 50, 'description' => 'Membre de l\'équipe — gestion projets et tâches']);
        \DB::table('roles')->where('name', 'client')
            ->update(['color' => '#10b981', 'icon' => 'Eye', 'level' => 10, 'description' => 'Client — accès lecture seule']);
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn(['description', 'color', 'icon', 'level', 'is_system', 'is_archived']);
        });
    }
};
