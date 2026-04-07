<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('color', 7)->default('#6366f1'); // couleur hex pour l'UI
            $table->timestamps();
        });

        // Pivot membres ↔ spécialités
        Schema::create('user_specialty', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specialty_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'specialty_id']);
        });

        // Pivot tâches ↔ spécialités
        Schema::create('task_specialty', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specialty_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['task_id', 'specialty_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_specialty');
        Schema::dropIfExists('user_specialty');
        Schema::dropIfExists('specialties');
    }
};
