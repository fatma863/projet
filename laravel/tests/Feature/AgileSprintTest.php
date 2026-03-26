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

class AgileSprintTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_start_and_end_sprint(): void
    {
        [$user, $project] = $this->seedProject();
        Sanctum::actingAs($user);

        $create = $this->postJson("/api/projects/{$project->id}/sprints", [
            'name' => 'Sprint 1',
            'goal' => 'Ship alpha',
        ])->assertCreated();

        $sprintId = $create->json('sprint.id');

        $this->postJson("/api/projects/{$project->id}/sprints/{$sprintId}/start")->assertOk();
        $this->postJson("/api/projects/{$project->id}/sprints/{$sprintId}/end")->assertOk();

        $this->assertDatabaseHas('sprints', [
            'id' => $sprintId,
            'status' => 'completed',
        ]);
    }

    public function test_can_assign_backlog_task_to_sprint(): void
    {
        [$user, $project, $task] = $this->seedProjectWithTask();
        Sanctum::actingAs($user);

        $sprintId = $this->postJson("/api/projects/{$project->id}/sprints", ['name' => 'Sprint 2'])
            ->assertCreated()
            ->json('sprint.id');

        $this->postJson("/api/projects/{$project->id}/sprints/{$sprintId}/tasks/{$task->id}")
            ->assertOk();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'sprint_id' => $sprintId,
        ]);
    }

    private function seedProject(): array
    {
        $user = User::factory()->create();
        $project = Project::query()->create([
            'name' => 'Agile Project',
            'code' => 'AG'.random_int(100, 999),
            'status' => 'active',
            'owner_id' => $user->id,
            'created_by' => $user->id,
        ]);
        $project->members()->attach($user->id, ['project_role' => 'owner']);
        Permission::findOrCreate('manage-all-projects', 'web');
        $user->givePermissionTo('manage-all-projects');

        return [$user, $project];
    }

    private function seedProjectWithTask(): array
    {
        [$user, $project] = $this->seedProject();
        $status = TaskStatus::query()->create([
            'project_id' => $project->id,
            'name' => 'Todo',
            'color' => '#6B7280',
            'order' => 0,
            'is_default' => true,
        ]);

        $task = Task::query()->create([
            'project_id' => $project->id,
            'title' => 'Backlog task',
            'status_id' => $status->id,
            'story_points' => 5,
            'created_by' => $user->id,
        ]);

        return [$user, $project, $task];
    }
}
