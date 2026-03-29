<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
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

    public function test_project_costs_are_calculated_from_task_hours(): void
    {
        $user = User::factory()->create();
        Permission::findOrCreate('manage-projects', 'web');
        Permission::findOrCreate('manage-all-projects', 'web');
        $user->givePermissionTo(['manage-projects', 'manage-all-projects']);
        Sanctum::actingAs($user);

        $project = Project::query()->create([
            'name' => 'Budget Project',
            'code' => 'BGT101',
            'status' => 'active',
            'owner_id' => $user->id,
            'created_by' => $user->id,
            'cost_per_hour' => 100,
        ]);
        $project->members()->attach($user->id, ['project_role' => 'owner']);
        $status = TaskStatus::query()->create([
            'project_id' => $project->id,
            'name' => 'Todo',
            'color' => '#6B7280',
            'order' => 0,
            'is_default' => true,
        ]);

        Task::query()->create([
            'project_id' => $project->id,
            'title' => 'T1',
            'status_id' => $status->id,
            'estimated_hours' => 5,
            'actual_hours' => 3,
            'created_by' => $user->id,
        ]);
        Task::query()->create([
            'project_id' => $project->id,
            'title' => 'T2',
            'status_id' => $status->id,
            'estimated_hours' => 2,
            'actual_hours' => 4,
            'created_by' => $user->id,
        ]);

        $resp = $this->postJson("/api/projects/{$project->id}/recalculate-costs")->assertOk();

        $this->assertEquals(700.0, $resp->json('estimated_cost'));
        $this->assertEquals(700.0, $resp->json('actual_cost'));
    }
}
