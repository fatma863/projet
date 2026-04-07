<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_comments', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('user_id')->constrained('task_comments')->cascadeOnDelete();
            $table->timestamp('edited_at')->nullable()->after('updated_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_in_app')->default(true)->after('remember_token');
            $table->boolean('notify_email')->default(false)->after('notify_in_app');
            $table->string('theme', 16)->nullable()->after('notify_email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['notify_in_app', 'notify_email', 'theme']);
        });

        Schema::table('task_comments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('edited_at');
        });
    }
};
