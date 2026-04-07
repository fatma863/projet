<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $drop = [];
            foreach (['budget', 'estimated_cost', 'actual_cost', 'cost_per_hour'] as $col) {
                if (Schema::hasColumn('projects', $col)) {
                    $drop[] = $col;
                }
            }
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'estimated_cost')) {
                $table->decimal('estimated_cost', 12, 2)->nullable();
            }
            if (! Schema::hasColumn('projects', 'actual_cost')) {
                $table->decimal('actual_cost', 12, 2)->nullable();
            }
            if (! Schema::hasColumn('projects', 'cost_per_hour')) {
                $table->decimal('cost_per_hour', 10, 2)->default(50);
            }
            if (! Schema::hasColumn('projects', 'budget')) {
                $table->decimal('budget', 12, 2)->nullable();
            }
        });
    }
};
