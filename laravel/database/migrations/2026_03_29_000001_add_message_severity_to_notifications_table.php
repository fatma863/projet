<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->text('message')->nullable()->after('user_id');
            $table->string('severity', 20)->default('info')->after('type');
        });

        foreach (DB::table('notifications')->orderBy('id')->cursor() as $row) {
            $data = json_decode($row->data, true) ?? [];
            $severity = match ($row->type) {
                'task_delayed', 'user_overload' => 'warning',
                'project_at_risk' => 'alert',
                default => 'info',
            };
            DB::table('notifications')->where('id', $row->id)->update([
                'message' => $data['message'] ?? $data['title'] ?? null,
                'severity' => $severity,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['message', 'severity']);
        });
    }
};
