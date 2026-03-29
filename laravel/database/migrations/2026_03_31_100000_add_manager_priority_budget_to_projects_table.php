<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('project_manager_id')
                ->nullable()
                ->after('client_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('priority', 20)->default('medium')->after('status');
            $table->decimal('budget', 12, 2)->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_manager_id');
            $table->dropColumn(['priority', 'budget']);
        });
    }
};
