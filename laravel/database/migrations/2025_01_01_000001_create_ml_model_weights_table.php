<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ml_model_weights', function (Blueprint $table) {
            $table->id();
            $table->string('model_name', 100)->default('task_assignment');
            $table->string('feature_name', 100);
            $table->double('weight');
            $table->integer('training_samples')->default(0);
            $table->double('accuracy')->nullable();
            $table->double('precision_score')->nullable();
            $table->double('recall_score')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['model_name', 'feature_name']);
            $table->index('model_name');
        });

        Schema::create('ml_assignment_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('feature_vector');
            $table->double('predicted_score');
            $table->tinyInteger('outcome')->nullable()->comment('1=success, 0=failure, null=pending');
            $table->boolean('on_time')->nullable();
            $table->double('hours_accuracy')->nullable();
            $table->timestamps();

            $table->index(['task_id', 'user_id']);
            $table->index('outcome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ml_assignment_feedback');
        Schema::dropIfExists('ml_model_weights');
    }
};
