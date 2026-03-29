<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->where('role', 'viewer')->update(['role' => 'guest']);

            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','guest') NOT NULL DEFAULT 'member'");
            }
        }

        if (! Schema::hasTable('project_invitations')) {
            Schema::create('project_invitations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('email');
                $table->string('role', 20);
                $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
                $table->string('token', 64)->unique();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('accepted_at')->nullable();
                $table->timestamps();

                $table->unique(['project_id', 'email']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_invitations');

        if (Schema::hasTable('project_user')) {
            DB::table('project_user')->where('role', 'guest')->update(['role' => 'viewer']);
            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE project_user MODIFY COLUMN role ENUM('admin','member','viewer') NOT NULL DEFAULT 'member'");
            }
        }
    }
};
