<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('email');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('team_id')->constrained('clients')->nullOnDelete();
            $table->decimal('estimated_cost', 12, 2)->nullable()->after('end_date');
            $table->decimal('actual_cost', 12, 2)->nullable()->after('estimated_cost');
            $table->decimal('cost_per_hour', 10, 2)->default(50)->after('actual_cost');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_id');
            $table->dropColumn(['estimated_cost', 'actual_cost', 'cost_per_hour']);
        });

        Schema::dropIfExists('clients');
    }
};
