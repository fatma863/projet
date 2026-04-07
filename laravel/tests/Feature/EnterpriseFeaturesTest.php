<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class EnterpriseFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_client_and_link_project(): void
    {
        $user = User::factory()->create();
        Permission::findOrCreate('manage-projects', 'web');
        $user->givePermissionTo('manage-projects');
        Sanctum::actingAs($user);

        $clientId = $this->postJson('/api/clients', [
            'name' => 'Client A',
            'company' => 'ACME',
            'email' => 'client@acme.test',
        ])->assertCreated()->json('client.id');

        $project = $this->postJson('/api/projects', [
            'name' => 'Proj Client',
            'code' => 'CLT101',
            'client_id' => $clientId,
            'project_manager_id' => $user->id,
        ])->assertCreated();

        $this->assertEquals($clientId, $project->json('project.client_id'));
    }
}
