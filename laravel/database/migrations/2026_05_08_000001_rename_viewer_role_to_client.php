<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $viewer = DB::table('roles')->where('name', 'viewer')->where('guard_name', 'web')->first();
        if (! $viewer) {
            return;
        }

        $client = DB::table('roles')->where('name', 'client')->where('guard_name', 'web')->first();

        if ($client) {
            // Move any users still on viewer role over to client, avoiding duplicates
            DB::table('model_has_roles')
                ->where('role_id', $viewer->id)
                ->whereNotIn('model_id', function ($q) use ($client) {
                    $q->select('model_id')
                        ->from('model_has_roles')
                        ->where('role_id', $client->id);
                })
                ->update(['role_id' => $client->id]);

            // Remove remaining viewer assignments (duplicates that now have client)
            DB::table('model_has_roles')->where('role_id', $viewer->id)->delete();

            // Remove viewer role entirely
            DB::table('role_has_permissions')->where('role_id', $viewer->id)->delete();
            DB::table('roles')->where('id', $viewer->id)->delete();
        } else {
            // No client role yet — simply rename viewer to client
            DB::table('roles')->where('id', $viewer->id)->update(['name' => 'client']);
        }
    }

    public function down(): void
    {
        // Restore viewer role (best-effort; cannot undo merged assignments)
        $client = DB::table('roles')->where('name', 'client')->where('guard_name', 'web')->first();
        if ($client) {
            DB::table('roles')->where('id', $client->id)->update(['name' => 'viewer']);
        }
    }
};
