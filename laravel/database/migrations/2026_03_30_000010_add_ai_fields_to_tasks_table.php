<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedInteger('estimated_duration')->nullable()->after('estimated_hours')->comment('Durée estimée en minutes (IA)');
            $table->string('risk_level', 20)->nullable()->after('estimated_duration');
            $table->unsignedTinyInteger('risk_score')->nullable()->after('risk_level');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['estimated_duration', 'risk_level', 'risk_score']);
        });
    }
};
