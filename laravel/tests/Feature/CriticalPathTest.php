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

class CriticalPathTest extends TestCase
{
    use RefreshDatabase;

    public function test_critical_path_endpoint_returns_structure(): void
    {
        $user = User::factory()->create();
        Permission::findOrCreate('manage-projects', 'web');
        Permission::findOrCreate('manage-all-projects', 'web');
        $user->givePermissionTo(['manage-projects', 'manage-all-projects']);
        Sanctum::actingAs($user);

        $project = Project::query()->create([
            'name' => 'CPM Test',
            'code' => 'CPM1',
            'status' => 'active',
            'owner_id' => $user->id,
            'created_by' => $user->id,
            'project_manager_id' => $user->id,
        ]);

        $status = TaskStatus::query()->create([
            'project_id' => $project->id,
            'name' => 'Todo',
            'color' => '#999',
            'order' => 0,
            'is_default' => true,
        ]);

        $a = Task::query()->create([
            'project_id' => $project->id,
            'title' => 'A',
            'status_id' => $status->id,
            'planned_start' => '2026-01-01',
            'planned_end' => '2026-01-02',
            'created_by' => $user->id,
            'kanban_order' => 0,
        ]);
        $b = Task::query()->create([
            'project_id' => $project->id,
            'title' => 'B',
            'status_id' => $status->id,
            'planned_start' => '2026-01-03',
            'planned_end' => '2026-01-04',
            'created_by' => $user->id,
            'kanban_order' => 1,
        ]);
        $b->dependencies()->sync([$a->id => ['type' => 'FS']]);

        $res = $this->getJson("/api/projects/{$project->id}/critical-path")->assertOk();

        $res->assertJsonStructure([
            'critical_tasks',
            'total_duration',
            'graph_valid',
            'schedule_ready',
        ]);
        $this->assertTrue($res->json('schedule_ready'));
        $this->assertTrue($res->json('graph_valid'));
        $this->assertGreaterThan(0, count($res->json('critical_tasks')));
    }
}
