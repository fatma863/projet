<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 10)->default('fr')->after('theme');
            $table->boolean('notify_type_task_assigned')->default(true)->after('locale');
            $table->boolean('notify_type_comment')->default(true)->after('notify_type_task_assigned');
            $table->boolean('notify_type_task_delayed')->default(true)->after('notify_type_comment');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'locale',
                'notify_type_task_assigned',
                'notify_type_comment',
                'notify_type_task_delayed',
            ]);
        });
    }
};
