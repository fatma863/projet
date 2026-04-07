<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_invitations')) {
            return;
        }

        Schema::table('project_invitations', function (Blueprint $table) {
            if (! Schema::hasColumn('project_invitations', 'status')) {
                $table->string('status', 20)->default('pending')->after('token');
            }
            if (! Schema::hasColumn('project_invitations', 'declined_at')) {
                $table->timestamp('declined_at')->nullable()->after('accepted_at');
            }
        });

        DB::table('project_invitations')->whereNotNull('accepted_at')->update(['status' => 'accepted']);
        DB::table('project_invitations')->whereNull('accepted_at')->where('status', 'pending')->update(['status' => 'pending']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('project_invitations')) {
            return;
        }

        Schema::table('project_invitations', function (Blueprint $table) {
            if (Schema::hasColumn('project_invitations', 'declined_at')) {
                $table->dropColumn('declined_at');
            }
            if (Schema::hasColumn('project_invitations', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
