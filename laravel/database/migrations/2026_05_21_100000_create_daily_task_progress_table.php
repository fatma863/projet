<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_task_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedSmallInteger('worked_minutes')->default(0);
            $table->tinyInteger('progress_delta')->default(0)->comment('Percentage points contributed this day (-100 to 100)');
            $table->unsignedTinyInteger('user_progress')->default(0)->comment('This user cumulative progress on this task (0-100)');
            $table->string('note', 500)->nullable();
            $table->timestamps();

            $table->unique(['task_id', 'user_id', 'date']);
            $table->index(['task_id', 'date']);
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_task_progress');
    }
};
